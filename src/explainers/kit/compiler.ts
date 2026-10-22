/**
 * Runs Orion's own trajectory compiler (`orion-trajectory`, built for WebAssembly by scripts/build-motion-wasm.sh)
 * in the reader's browser.
 *
 * The program expects a computer with files and a command line, so this module plays both parts: it hands the program
 * its arguments and a small in-memory file system holding Orion's poses, motions and joint limits, then collects what
 * it prints. That is the WASI interface (the WebAssembly System Interface); only the dozen calls this program makes are
 * implemented here.
 */
import { motionYaml, type Motion } from "./orion";


// Orion's data files, copied from its repository by the build script. `?raw` bundles each file as text.
const FILES = import.meta.glob("../../data/orion/files/**/*", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;
const ROOT = "../../data/orion/files/";
const MOTIONS_DIR = "motion/motions/v2/";

export interface JointState {
  positions: Record<string, number>;
  velocities: Record<string, number>;
  anchor: Record<string, number>;
}

export interface Trajectory {
  motion_name: string;
  style: string;
  joint_names: string[];
  duration_seconds: number;
  control_rate_hz: number;
  peak_velocity_rad_s: number;
  amplitude_scale: number;
  hardware_profile: { maximum_velocity_rad_s: number };
  joint_ranges: { name: string; lower_rad: number; upper_rad: number }[];
  markers: { name: string; time_seconds: number }[];
  samples: {
    time_from_start: number;
    positions: number[];
    velocities: number[];
    accelerations: number[];
    keyframe_index: number;
  }[];
}

export interface CompileRequest {
  /** A built-in motion by name, or an edited motion that replaces the built-in of the same name. */
  motion: string | Motion;
  /** Where the lamp starts: a named pose (still), or exact positions, velocities and the anchor. */
  start: string | JointState;
  /** The anchor pose for relative motions when starting from a named pose. Defaults to the start pose. */
  anchor?: string;
  /** Extra named poses (a reader's own), added to Orion's pose file so absolute keyframes can use them. */
  poses?: Record<string, Partial<Record<string, number>>>;
}

/** Thrown with the compiler's own message when Orion would refuse the motion. */
export class CompileError extends Error {}

let modulePromise: Promise<WebAssembly.Module> | null = null;
const loadModule = () => (modulePromise ??= WebAssembly.compileStreaming(fetch("/learn/orion-trajectory.wasm")));

export async function compileMotion(request: CompileRequest): Promise<Trajectory> {
  const files = new Map<string, Uint8Array>();
  const enc = new TextEncoder();
  for (const [path, text] of Object.entries(FILES)) files.set(path.slice(ROOT.length), enc.encode(text));

  if (request.poses) {
    // poses: is the last top-level key of the pose file, so new entries can simply follow it.
    const extra = Object.entries(request.poses).map(
      ([pose, positions]) => `  ${pose}:\n    positions: ${JSON.stringify(positions)}\n`,
    );
    const path = "motion/config/v2/poses.yaml";
    files.set(path, enc.encode(new TextDecoder().decode(files.get(path)) + extra.join("")));
  }

  const name = typeof request.motion === "string" ? request.motion : request.motion.name;
  if (typeof request.motion !== "string") {
    // Drop the built-in file of that name so the edited copy takes its place (Orion refuses duplicate names).
    for (const [path, data] of files) {
      if (path.startsWith(MOTIONS_DIR) && new TextDecoder().decode(data).includes(`name: ${name}\n`)) files.delete(path);
    }
    files.set(`${MOTIONS_DIR}user/${name}.yaml`, enc.encode(motionYaml(request.motion)));
  }

  const args = ["orion-trajectory", "--hardware", "v2", "--motion", name];
  if (typeof request.start === "string") {
    args.push("--start-pose", request.start);
    if (request.anchor) args.push("--anchor-pose", request.anchor);
  } else {
    files.set("start.json", enc.encode(JSON.stringify(request.start)));
    args.push("--start-state", "/start.json");
  }

  const { code, stdout, stderr } = await run(await loadModule(), args, files);
  if (code !== 0) throw new CompileError(stderr.replace(/^orion-trajectory: /, "").trim() || `exit ${code}`);
  return JSON.parse(stdout) as Trajectory;
}

// ---------------------------------------------------------------------------------------------------------------
// A minimal WASI host: read-only files from a Map, stdout/stderr captured as text.

const ERRNO = { SUCCESS: 0, BADF: 8, INVAL: 28, ISDIR: 31, NOENT: 44, NOTDIR: 54 };
const FILETYPE = { CHAR: 2, DIR: 3, FILE: 4 };
const PREOPEN_FD = 3;

class Exit {
  constructor(readonly code: number) {}
}

type Fd = { dir: string } | { file: Uint8Array; pos: number } | { stream: number };

async function run(module: WebAssembly.Module, args: string[], files: Map<string, Uint8Array>) {
  const dirs = new Set([""]);
  for (const path of files.keys()) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
  }
  const out: string[] = [];
  const err: string[] = [];
  const fds = new Map<number, Fd>([
    [0, { stream: 0 }],
    [1, { stream: 1 }],
    [2, { stream: 2 }],
    [PREOPEN_FD, { dir: "" }],
  ]);
  let nextFd = 4;
  let memory: WebAssembly.Memory;
  const view = () => new DataView(memory.buffer);
  const bytes = () => new Uint8Array(memory.buffer);
  const readString = (ptr: number, len: number) => new TextDecoder().decode(bytes().slice(ptr, ptr + len));

  // Paths arrive relative to an open directory; "." and ".." are resolved here.
  const resolve = (fd: number, ptr: number, len: number) => {
    const base = fds.get(fd);
    if (!base || !("dir" in base)) return null;
    const parts = [...base.dir.split("/"), ...readString(ptr, len).split("/")].filter((p) => p && p !== ".");
    const stack: string[] = [];
    for (const p of parts) p === ".." ? stack.pop() : stack.push(p);
    return stack.join("/");
  };
  const writeFilestat = (ptr: number, type: number, size: number) => {
    const v = view();
    for (let i = 0; i < 64; i += 8) v.setBigUint64(ptr + i, 0n, true);
    v.setUint8(ptr + 16, type);
    v.setBigUint64(ptr + 24, 1n, true);
    v.setBigUint64(ptr + 32, BigInt(size), true);
  };
  const statOf = (path: string): [number, number] | null =>
    files.has(path) ? [FILETYPE.FILE, files.get(path)!.length] : dirs.has(path) ? [FILETYPE.DIR, 0] : null;

  const wasi = {
    args_sizes_get(argc: number, bufSize: number) {
      view().setUint32(argc, args.length, true);
      view().setUint32(bufSize, args.reduce((n, a) => n + new TextEncoder().encode(a).length + 1, 0), true);
      return ERRNO.SUCCESS;
    },
    args_get(argv: number, buf: number) {
      for (const a of args) {
        const data = new TextEncoder().encode(`${a}\0`);
        view().setUint32(argv, buf, true);
        bytes().set(data, buf);
        argv += 4;
        buf += data.length;
      }
      return ERRNO.SUCCESS;
    },
    environ_sizes_get(count: number, size: number) {
      view().setUint32(count, 0, true);
      view().setUint32(size, 0, true);
      return ERRNO.SUCCESS;
    },
    environ_get: () => ERRNO.SUCCESS,
    random_get(ptr: number, len: number) {
      crypto.getRandomValues(bytes().subarray(ptr, ptr + len));
      return ERRNO.SUCCESS;
    },
    proc_exit(code: number) {
      throw new Exit(code);
    },
    fd_prestat_get(fd: number, ptr: number) {
      if (fd !== PREOPEN_FD) return ERRNO.BADF;
      view().setUint8(ptr, 0); // a directory
      view().setUint32(ptr + 4, 1, true); // its name, "/", is one byte
      return ERRNO.SUCCESS;
    },
    fd_prestat_dir_name(fd: number, ptr: number) {
      if (fd !== PREOPEN_FD) return ERRNO.BADF;
      bytes()[ptr] = 0x2f; // "/"
      return ERRNO.SUCCESS;
    },
    fd_fdstat_get(fd: number, ptr: number) {
      const f = fds.get(fd);
      if (!f) return ERRNO.BADF;
      const v = view();
      v.setUint8(ptr, "stream" in f ? FILETYPE.CHAR : "dir" in f ? FILETYPE.DIR : FILETYPE.FILE);
      v.setUint16(ptr + 2, 0, true);
      v.setBigUint64(ptr + 8, 0xffffffffn, true); // every right; nothing here can be harmed
      v.setBigUint64(ptr + 16, 0xffffffffn, true);
      return ERRNO.SUCCESS;
    },
    fd_filestat_get(fd: number, ptr: number) {
      const f = fds.get(fd);
      if (!f) return ERRNO.BADF;
      if ("file" in f) writeFilestat(ptr, FILETYPE.FILE, f.file.length);
      else writeFilestat(ptr, "dir" in f ? FILETYPE.DIR : FILETYPE.CHAR, 0);
      return ERRNO.SUCCESS;
    },
    path_filestat_get(fd: number, _flags: number, pathPtr: number, pathLen: number, ptr: number) {
      const path = resolve(fd, pathPtr, pathLen);
      const stat = path === null ? null : statOf(path);
      if (!stat) return ERRNO.NOENT;
      writeFilestat(ptr, stat[0], stat[1]);
      return ERRNO.SUCCESS;
    },
    path_open(
      fd: number, _dirflags: number, pathPtr: number, pathLen: number, oflags: number,
      _rightsBase: bigint, _rightsInheriting: bigint, _fdflags: number, fdOut: number,
    ) {
      const path = resolve(fd, pathPtr, pathLen);
      if (path === null) return ERRNO.BADF;
      const wantsDir = (oflags & 2) !== 0;
      let opened: Fd;
      if (files.has(path)) {
        if (wantsDir) return ERRNO.NOTDIR;
        opened = { file: files.get(path)!, pos: 0 };
      } else if (dirs.has(path)) {
        opened = { dir: path };
      } else return ERRNO.NOENT;
      fds.set(nextFd, opened);
      view().setUint32(fdOut, nextFd++, true);
      return ERRNO.SUCCESS;
    },
    fd_close(fd: number) {
      return fds.delete(fd) ? ERRNO.SUCCESS : ERRNO.BADF;
    },
    fd_read(fd: number, iovs: number, iovsLen: number, nread: number) {
      const f = fds.get(fd);
      if (!f) return ERRNO.BADF;
      if (!("file" in f)) return "dir" in f ? ERRNO.ISDIR : (view().setUint32(nread, 0, true), ERRNO.SUCCESS);
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = view().getUint32(iovs + i * 8, true);
        const len = view().getUint32(iovs + i * 8 + 4, true);
        const chunk = f.file.subarray(f.pos, f.pos + len);
        bytes().set(chunk, ptr);
        f.pos += chunk.length;
        total += chunk.length;
        if (chunk.length < len) break;
      }
      view().setUint32(nread, total, true);
      return ERRNO.SUCCESS;
    },
    fd_write(fd: number, iovs: number, iovsLen: number, nwritten: number) {
      if (fd !== 1 && fd !== 2) return ERRNO.BADF;
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = view().getUint32(iovs + i * 8, true);
        const len = view().getUint32(iovs + i * 8 + 4, true);
        (fd === 1 ? out : err).push(readString(ptr, len));
        total += len;
      }
      view().setUint32(nwritten, total, true);
      return ERRNO.SUCCESS;
    },
    // Directory listing: one record per entry (next cookie, inode, name length, type, then the name).
    fd_readdir(fd: number, buf: number, bufLen: number, cookie: bigint, bufUsed: number) {
      const f = fds.get(fd);
      if (!f || !("dir" in f)) return ERRNO.BADF;
      const prefix = f.dir ? `${f.dir}/` : "";
      const names = new Set<string>();
      for (const p of [...files.keys(), ...dirs]) {
        if (p.startsWith(prefix) && p.length > prefix.length) names.add(p.slice(prefix.length).split("/")[0]);
      }
      const entries = [...names].sort();
      let used = 0;
      for (let i = Number(cookie); i < entries.length; i++) {
        const name = new TextEncoder().encode(entries[i]);
        const record = new Uint8Array(24 + name.length);
        const rv = new DataView(record.buffer);
        rv.setBigUint64(0, BigInt(i + 1), true);
        rv.setBigUint64(8, BigInt(i + 1), true);
        rv.setUint32(16, name.length, true);
        rv.setUint8(20, files.has(prefix + entries[i]) ? FILETYPE.FILE : FILETYPE.DIR);
        record.set(name, 24);
        const room = bufLen - used;
        bytes().set(record.subarray(0, Math.min(room, record.length)), buf + used);
        used += Math.min(room, record.length);
        if (used >= bufLen) break;
      }
      view().setUint32(bufUsed, used, true);
      return ERRNO.SUCCESS;
    },
  };

  const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi });
  memory = instance.exports.memory as WebAssembly.Memory;
  let code = 0;
  try {
    (instance.exports._start as () => void)();
  } catch (e) {
    if (e instanceof Exit) code = e.code;
    else throw e;
  }
  return { code, stdout: out.join(""), stderr: err.join("") };
}
