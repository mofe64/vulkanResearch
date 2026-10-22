//! Stands in for the `orion_runtime` crate so Orion's `orion-trajectory` program builds for the browser.
//!
//! The motion code (pose and motion loading, styles, the trajectory compiler and joint calibration) is Orion's own,
//! copied unchanged into `orion-src/` by `scripts/build-motion-wasm.sh`. Only the pieces that reach hardware are
//! replaced here: the hardware profile lookup, and two constants the loaders check names against.

#[path = "../orion-src/error.rs"]
pub mod error;
pub mod motion;

pub use error::{Error, Result};
pub use motion::calibration::{JointCalibration, load_calibration_file};
pub use motion::library::{MotionDefinition, MotionLibrary, MotionSequence, MotionSpace};
pub use motion::pose::{JointPositions, PoseLibrary};
pub use motion::trajectory::STS3215_MAX_SPEED_RAD_S;
pub use devices::driver::JointLimit;
pub use hardware::HardwareVersion;

pub const ORION_JOINT_NAMES: [&str; 5] = [
    "base_yaw_joint",
    "shoulder_pitch_joint",
    "elbow_pitch_joint",
    "head_roll_joint",
    "head_pitch_joint",
];

/// The Orion commit the motion sources were copied from.
pub const BUILD_REVISION: &str = include_str!("../orion-src/REVISION");

pub mod devices {
    pub mod driver {
        use serde::Serialize;

        #[derive(Clone, Debug, PartialEq, Serialize)]
        pub struct JointLimit {
            pub name: String,
            pub lower_rad: f64,
            pub upper_rad: f64,
        }
    }

    pub mod lighting {
        // Generated from Orion's devices/lighting.rs; poses may name a default light effect from this list.
        include!("../orion-src/lighting_names.rs");
    }
}

pub mod expression {
    pub mod speech {
        /// The spoken reaction cues. Their motions must follow the reaction contract, which the motion loader checks.
        #[derive(Clone, Copy)]
        pub struct SpeechCue(&'static str);

        impl SpeechCue {
            pub const ALL: [Self; 11] = [
                Self("speak_react_agree"),
                Self("speak_react_disagree"),
                Self("speak_react_happy"),
                Self("speak_react_curious"),
                Self("speak_react_thinking"),
                Self("speak_react_surprised"),
                Self("speak_react_sympathy"),
                Self("speak_react_sorry"),
                Self("speak_react_shy"),
                Self("speak_react_unsure"),
                Self("speak_react_laugh"),
            ];

            pub fn motion(self) -> &'static str {
                self.0
            }
        }
    }
}

pub mod hardware {
    use std::path::{Path, PathBuf};
    use std::str::FromStr;

    use crate::{Error, JointCalibration, Result};

    /// Where the motion files live. The browser writes them into a small in-memory file system at this root.
    pub fn resource_root() -> Result<PathBuf> {
        Ok(PathBuf::from("/"))
    }

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum HardwareVersion {
        V1,
        V2,
    }

    pub struct HardwareProfile {
        pub joint_profile: String,
        pub poses: String,
        pub motions: String,
    }

    impl FromStr for HardwareVersion {
        type Err = Error;

        fn from_str(value: &str) -> Result<Self> {
            match value {
                "v1" => Ok(Self::V1),
                "v2" => Ok(Self::V2),
                _ => Err(Error::InvalidArgument(format!("Unknown hardware version: {value}"))),
            }
        }
    }

    impl HardwareVersion {
        /// Only V2 ships to the browser; its paths match Orion's `hardware/profiles/v2.json`.
        pub fn profile(self) -> HardwareProfile {
            HardwareProfile {
                joint_profile: "hardware/profiles/v2-joints.json".into(),
                poses: "motion/config/v2/poses.yaml".into(),
                motions: "motion/motions/v2".into(),
            }
        }

        pub fn load_calibration(self, path: impl AsRef<Path>) -> Result<Vec<JointCalibration>> {
            match self {
                Self::V2 => crate::motion::calibration::load_joint_profile(path),
                Self::V1 => Err(Error::InvalidArgument("Only Orion V2 is available here.".into())),
            }
        }
    }
}
