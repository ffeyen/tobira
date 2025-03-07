//! This module defines the command line arguments Tobira accepts.

use std::path::PathBuf;
use structopt::StructOpt;

use crate::{cmd, db::cmd::DbCommand};


#[derive(Debug, StructOpt)]
#[structopt(
    about = "Video portal for Opencast.",
    setting(structopt::clap::AppSettings::VersionlessSubcommands),
)]
pub(crate) struct Args {
    #[structopt(subcommand)]
    pub(crate) cmd: Command,
}

#[derive(Debug, StructOpt)]
pub(crate) enum Command {
    /// Starts the backend HTTP server.
    Serve {
        #[structopt(flatten)]
        shared: Shared,
    },

    /// Synchronizes Tobira with the configured Opencast instance.
    Sync {
        /// If specified, the command will run forever listening for new data.
        #[structopt(long)]
        daemon: bool,

        #[structopt(flatten)]
        shared: Shared,
    },

    /// Database operations.
    Db {
        #[structopt(subcommand)]
        cmd: DbCommand,

        #[structopt(flatten)]
        shared: Shared,
    },

    /// Outputs a template for the configuration file (which includes
    /// descriptions or all options).
    WriteConfig {
        /// Target file. If not specified, the template is written to stdout.
        target: Option<PathBuf>,
    },

    /// Exports the API as GraphQL schema.
    ExportApiSchema {
        #[structopt(flatten)]
        args: cmd::export_api_schema::Args,
    },

    /// Imports a realm tree from a YAML description (internal tool, no stability guaranteed!).
    ImportRealmTree {
        #[structopt(flatten)]
        options: cmd::import_realm_tree::Args,

        #[structopt(flatten)]
        shared: Shared,
    },
}

#[derive(Debug, StructOpt)]
pub(crate) struct Shared {
    /// Path to the configuration file. If this is not specified, Tobira will
    /// try opening `config.toml` or `/etc/tobira/config.toml`.
    #[structopt(short, long)]
    pub(crate) config: Option<PathBuf>,
}
