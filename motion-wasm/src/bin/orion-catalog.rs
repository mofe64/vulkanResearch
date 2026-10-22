//! Prints Orion's joints, poses, motions and motion styles as one JSON document for the website.
//! It loads them with Orion's own loaders, so a file Orion would reject never reaches a lesson.
//!
//! usage: orion-catalog <orion repository> > src/data/orion/catalog.json

use std::path::Path;
use std::process::ExitCode;

use orion_runtime::motion::style::{MotionStyle, motion_styles};
use orion_runtime::{HardwareVersion, MotionLibrary, MotionSpace, ORION_JOINT_NAMES, PoseLibrary, Result};
use serde::Serialize;
use serde_json::{Value, json};

#[derive(Serialize)]
struct Catalog<'a> {
    revision: &'a str,
    joints: Vec<Value>,
    poses: Vec<Value>,
    motions: Vec<Value>,
    styles: &'a [MotionStyle],
}

fn main() -> ExitCode {
    let Some(root) = std::env::args().nth(1) else {
        eprintln!("usage: orion-catalog <orion repository>");
        return ExitCode::FAILURE;
    };
    match run(Path::new(&root)) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("orion-catalog: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run(root: &Path) -> Result<()> {
    let profile = HardwareVersion::V2.profile();
    let poses = PoseLibrary::load(root.join(&profile.poses), &ORION_JOINT_NAMES)?;
    let motions = MotionLibrary::load(root.join(&profile.motions), &poses)?;
    let joints = HardwareVersion::V2
        .load_calibration(root.join(&profile.joint_profile))?
        .iter()
        .map(|joint| {
            let (lower, upper) = joint.safe_range_radians();
            json!({ "name": joint.name, "servo_id": joint.servo_id, "lower_rad": lower, "upper_rad": upper })
        })
        .collect();
    let poses_json = poses
        .names()
        .iter()
        .map(|name| {
            let pose = poses.definition(name)?;
            Ok(json!({ "name": pose.name, "description": pose.description, "tags": pose.tags, "positions": pose.positions }))
        })
        .collect::<Result<Vec<_>>>()?;
    let motions_json = motions
        .iter()
        .map(|(name, motion)| {
            let keyframes: Vec<Value> = motion
                .keyframes
                .iter()
                .map(|k| {
                    json!({
                        "pose": k.pose_name, "target": k.target, "duration": k.duration_seconds,
                        "arrival": k.arrival, "hold": k.hold_seconds, "marker": k.marker,
                    })
                })
                .collect();
            let space = match motion.space {
                MotionSpace::Absolute => "absolute",
                MotionSpace::AnchorRelative => "anchor_relative",
            };
            json!({ "name": name, "description": motion.description, "space": space, "style": motion.style.name, "keyframes": keyframes })
        })
        .collect();
    let catalog = Catalog {
        revision: orion_runtime::BUILD_REVISION,
        joints,
        poses: poses_json,
        motions: motions_json,
        styles: motion_styles(),
    };
    println!("{}", serde_json::to_string_pretty(&catalog)?);
    Ok(())
}
