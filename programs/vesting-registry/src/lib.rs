//! UnlockLens vesting-schedule transparency registry.
//!
//! A permissionless on-chain registry where anyone can publish a token's
//! vesting / unlock schedule, and only the declared authority can move the
//! released counter — monotonically. Dashboards and auditors read these
//! accounts directly over RPC: no API key, no backend trust required.
//!
//! NOTE: the program ID below is a placeholder. At deploy time, generate a
//! fresh keypair, replace this value, and update `app/src/config.ts` with the
//! same address.

use anchor_lang::prelude::*;

mod validation;
use validation::{
    validate_registration, validate_release_update, ValidationError as VErr,
};

declare_id!("11111111111111111111111111111111");

#[program]
pub mod vesting_registry {
    use super::*;

    /// Publish a vesting schedule for (mint, beneficiary). Anyone may call
    /// this — transparency is permissionless. The caller becomes the
    /// authority allowed to report releases.
    pub fn register_schedule(
        ctx: Context<RegisterSchedule>,
        category: u8,
        total_amount: u64,
        start_ts: i64,
        cliff_ts: i64,
        end_ts: i64,
    ) -> Result<()> {
        validate_registration(category, total_amount, start_ts, cliff_ts, end_ts)
            .map_err(|e| map_validation(e))?;

        let schedule = &mut ctx.accounts.vesting_schedule;
        schedule.mint = ctx.accounts.mint.key();
        schedule.beneficiary = ctx.accounts.beneficiary.key();
        schedule.authority = ctx.accounts.authority.key();
        schedule.category = category;
        schedule.total_amount = total_amount;
        schedule.released_amount = 0;
        schedule.start_ts = start_ts;
        schedule.cliff_ts = cliff_ts;
        schedule.end_ts = end_ts;
        schedule.created_at = Clock::get()?.unix_timestamp;
        schedule.bump = ctx.bumps.vesting_schedule;

        emit!(ScheduleRegistered {
            schedule: schedule.key(),
            mint: schedule.mint,
            beneficiary: schedule.beneficiary,
            category,
            total_amount,
        });
        Ok(())
    }

    /// Report newly released tokens. Monotonic: `new_released` can only move
    /// up and can never exceed the registered total. Authority-only.
    pub fn update_released(
        ctx: Context<UpdateReleased>,
        new_released: u64,
    ) -> Result<()> {
        let schedule = &mut ctx.accounts.vesting_schedule;
        validate_release_update(schedule.released_amount, schedule.total_amount, new_released)
            .map_err(|e| map_validation(e))?;

        schedule.released_amount = new_released;

        emit!(ReleaseUpdated {
            schedule: schedule.key(),
            released_amount: new_released,
            ts: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Retire a schedule and reclaim rent. Authority-only.
    pub fn close_schedule(_ctx: Context<CloseSchedule>) -> Result<()> {
        Ok(())
    }
}

fn map_validation(e: VErr) -> Error {
    match e {
        VErr::InvalidCategory => RegistryError::InvalidCategory.into(),
        VErr::ZeroAmount => RegistryError::ZeroAmount.into(),
        VErr::InvalidTimeRange => RegistryError::InvalidTimeRange.into(),
        VErr::ReleaseDecreased => RegistryError::ReleaseDecreased.into(),
        VErr::ReleaseExceedsTotal => RegistryError::ReleaseExceedsTotal.into(),
    }
}

/// One registry entry: the full unlock promise for a single beneficiary.
#[account]
pub struct VestingSchedule {
    pub mint: Pubkey,
    pub beneficiary: Pubkey,
    pub authority: Pubkey,
    pub category: u8, // 0=Team 1=Investors 2=Contributors 3=Community 4=Other
    pub total_amount: u64,
    pub released_amount: u64,
    pub start_ts: i64,
    pub cliff_ts: i64,
    pub end_ts: i64,
    pub created_at: i64,
    pub bump: u8,
}

impl VestingSchedule {
    pub const LEN: usize = 8 + 32 * 3 + 1 + 8 + 8 + 8 * 4 + 1;
}

#[derive(Accounts)]
#[instruction(category: u8, total_amount: u64, start_ts: i64, cliff_ts: i64, end_ts: i64)]
pub struct RegisterSchedule<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: any SPL mint; the registry only records its address.
    pub mint: UncheckedAccount<'info>,
    /// CHECK: any beneficiary address; no signature needed to register.
    pub beneficiary: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = VestingSchedule::LEN,
        seeds = [b"vesting-schedule", mint.key().as_ref(), beneficiary.key().as_ref()],
        bump,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReleased<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vesting-schedule", vesting_schedule.mint.as_ref(), vesting_schedule.beneficiary.as_ref()],
        bump = vesting_schedule.bump,
        has_one = authority @ RegistryError::Unauthorized,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,
}

#[derive(Accounts)]
pub struct CloseSchedule<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
        seeds = [b"vesting-schedule", vesting_schedule.mint.as_ref(), vesting_schedule.beneficiary.as_ref()],
        bump = vesting_schedule.bump,
        has_one = authority @ RegistryError::Unauthorized,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,
}

#[event]
pub struct ScheduleRegistered {
    pub schedule: Pubkey,
    pub mint: Pubkey,
    pub beneficiary: Pubkey,
    pub category: u8,
    pub total_amount: u64,
}

#[event]
pub struct ReleaseUpdated {
    pub schedule: Pubkey,
    pub released_amount: u64,
    pub ts: i64,
}

#[error_code]
pub enum RegistryError {
    #[msg("Only the schedule authority may call this instruction.")]
    Unauthorized,
    #[msg("Category must be 0=Team, 1=Investors, 2=Contributors, 3=Community, 4=Other.")]
    InvalidCategory,
    #[msg("Total amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Require 0 <= start <= cliff and end > start.")]
    InvalidTimeRange,
    #[msg("Released amount is monotonic: it cannot decrease.")]
    ReleaseDecreased,
    #[msg("Released amount cannot exceed the registered total.")]
    ReleaseExceedsTotal,
}
