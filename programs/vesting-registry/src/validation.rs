//! Pure validation logic for the vesting registry.
//!
//! Kept dependency-free so it can be unit-tested on any host target with
//! `cargo test` — no Solana validator, no BPF toolchain required.

/// Beneficiary categories. Must stay in sync with `Category` in lib.rs.
pub const CATEGORY_TEAM: u8 = 0;
pub const CATEGORY_INVESTORS: u8 = 1;
pub const CATEGORY_CONTRIBUTORS: u8 = 2;
pub const CATEGORY_COMMUNITY: u8 = 3;
pub const CATEGORY_OTHER: u8 = 4;

#[derive(Debug, PartialEq, Eq)]
pub enum ValidationError {
    InvalidCategory,
    ZeroAmount,
    InvalidTimeRange,
    ReleaseDecreased,
    ReleaseExceedsTotal,
}

pub fn validate_category(category: u8) -> Result<(), ValidationError> {
    if category <= CATEGORY_OTHER {
        Ok(())
    } else {
        Err(ValidationError::InvalidCategory)
    }
}

pub fn validate_time_range(
    start_ts: i64,
    cliff_ts: i64,
    end_ts: i64,
) -> Result<(), ValidationError> {
    if start_ts < 0 || cliff_ts < start_ts || end_ts <= start_ts {
        Err(ValidationError::InvalidTimeRange)
    } else {
        Ok(())
    }
}

pub fn validate_registration(
    category: u8,
    total_amount: u64,
    start_ts: i64,
    cliff_ts: i64,
    end_ts: i64,
) -> Result<(), ValidationError> {
    validate_category(category)?;
    if total_amount == 0 {
        return Err(ValidationError::ZeroAmount);
    }
    validate_time_range(start_ts, cliff_ts, end_ts)?;
    Ok(())
}

pub fn validate_release_update(
    released_amount: u64,
    total_amount: u64,
    new_released: u64,
) -> Result<(), ValidationError> {
    if new_released < released_amount {
        return Err(ValidationError::ReleaseDecreased);
    }
    if new_released > total_amount {
        return Err(ValidationError::ReleaseExceedsTotal);
    }
    Ok(())
}

/// Linear unlock math used by the dashboard: how much *should* be unlocked
/// at `now_ts` given a straight-line schedule from start to end.
#[allow(dead_code)] // consumed by the dashboard client, not the program
pub fn linear_unlocked_at(
    total_amount: u64,
    start_ts: i64,
    end_ts: i64,
    now_ts: i64,
) -> u64 {
    if now_ts <= start_ts || end_ts <= start_ts {
        return 0;
    }
    if now_ts >= end_ts {
        return total_amount;
    }
    let elapsed = (now_ts - start_ts) as u128;
    let duration = (end_ts - start_ts) as u128;
    ((total_amount as u128) * elapsed / duration) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_registration() {
        assert!(validate_registration(1, 1_000_000, 1_700_000_000, 1_710_000_000, 1_800_000_000).is_ok());
    }

    #[test]
    fn rejects_bad_category() {
        assert_eq!(
            validate_registration(9, 1_000_000, 1_700_000_000, 1_710_000_000, 1_800_000_000),
            Err(ValidationError::InvalidCategory)
        );
    }

    #[test]
    fn rejects_zero_amount() {
        assert_eq!(
            validate_registration(0, 0, 1_700_000_000, 1_710_000_000, 1_800_000_000),
            Err(ValidationError::ZeroAmount)
        );
    }

    #[test]
    fn rejects_inverted_time_range() {
        assert_eq!(
            validate_time_range(1_800_000_000, 1_810_000_000, 1_700_000_000),
            Err(ValidationError::InvalidTimeRange)
        );
        assert_eq!(
            validate_time_range(1_700_000_000, 1_690_000_000, 1_800_000_000),
            Err(ValidationError::InvalidTimeRange)
        );
    }

    #[test]
    fn release_must_be_monotonic_and_capped() {
        assert!(validate_release_update(100, 1000, 400).is_ok());
        assert_eq!(
            validate_release_update(400, 1000, 100),
            Err(ValidationError::ReleaseDecreased)
        );
        assert_eq!(
            validate_release_update(400, 1000, 1001),
            Err(ValidationError::ReleaseExceedsTotal)
        );
        // Releasing the full total is fine.
        assert!(validate_release_update(400, 1000, 1000).is_ok());
    }

    #[test]
    fn linear_unlock_math() {
        // 1000 tokens over 100 seconds: at t=50, half unlocked.
        assert_eq!(linear_unlocked_at(1000, 0, 100, 50), 500);
        assert_eq!(linear_unlocked_at(1000, 0, 100, 0), 0);
        assert_eq!(linear_unlocked_at(1000, 0, 100, 200), 1000);
        assert_eq!(linear_unlocked_at(1000, 0, 100, -5), 0);
    }
}
