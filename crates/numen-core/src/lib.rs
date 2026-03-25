pub mod scaffold {
    pub const CRATE_NAME: &str = "numen-core";

    pub fn ready_message() -> String {
        format!("{CRATE_NAME} is ready for bookkeeping features")
    }
}

#[cfg(test)]
mod tests {
    use crate::scaffold::{CRATE_NAME, ready_message};

    #[test]
    fn placeholder_module_reports_readiness() {
        assert_eq!(CRATE_NAME, "numen-core");
        assert_eq!(
            ready_message(),
            "numen-core is ready for bookkeeping features"
        );
    }
}
