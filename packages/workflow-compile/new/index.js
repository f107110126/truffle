const debug = require("debug")("workflow-compile:new");
const fse = require("fs-extra");
const { prepareConfig, byContractName } = require("../utils");
const { shimLegacy } = require("../shims");
const { shimContract } = require("@truffle/compile-solidity/legacy/shims");
const {
  reportCompilationStarted,
  reportNothingToCompile,
  reportCompilationFinished
} = require("../reports");

let TruffleDB;
let load;
try {
  TruffleDB = require("truffle-db").TruffleDB;
  load = require("truffle-db/loaders/commands/compile").load;
} catch (_) {
  // leave TruffleDB undefined, we just can't use it
}

const SUPPORTED_COMPILERS = {
  solc: {
    compiler: require("@truffle/compile-solidity/new")
  },
  vyper: {
    compiler: require("@truffle/compile-vyper"),
    legacy: true
  },
  external: {
    compiler: require("@truffle/external-compile"),
    legacy: true
  }
};

async function compile(config) {
  // determine compiler(s) to use
  //

  const compilers = config.compiler
    ? [config.compiler]
    : Object.keys(config.compilers);

  // invoke compilers
  //

  const rawCompilations = await Promise.all(
    compilers.map(async name => {
      const { compiler, legacy } = SUPPORTED_COMPILERS[name] || {};
      if (!compiler) throw new Error("Unsupported compiler: " + name);

      const method =
        config.all === true || config.compileAll === true
          ? compiler.all
          : compiler.necessary;

      const compile = legacy ? shimLegacy(method) : method;

      return {
        [name]: await compile(config)
      };
    })
  );

  // collect results
  //

  const compilations = rawCompilations.reduce(
    (a, b) => Object.assign({}, a, b),
    {}
  );

  const contracts = Object.values(compilations)
    .map(({ contracts }) => contracts)
    .reduce((a, b) => [...a, ...b], []);

  return { contracts, compilations };
}

const Contracts = {
  async compile(options) {
    const config = prepareConfig(options);
    reportCompilationStarted(config);

    const { contracts, compilations } = await compile(config);

    if (contracts.length === 0) {
      reportNothingToCompile(config);
    }

    reportCompilationFinished(config);
    return {
      contracts,
      compilations
    };
  },

  async save(options, contracts, compilations = null) {
    // saves contracts and/or compilations using the Artifactor, and
    // optionally saving to Truffle DB also
    const config = prepareConfig(options);

    // save with artifactor
    await fse.ensureDir(config.contracts_build_directory);
    const artifacts = byContractName(contracts.map(shimContract));
    await config.artifactor.saveAll(artifacts);

    // optionally save to Truffle DB
    if (TruffleDB && config.db && config.db.enabled && compilations) {
      await Contracts.saveToDB(config, { contracts, compilations });
    }
  },

  async saveToDB(config, result) {
    const db = new TruffleDB(config);

    await load(db, result);
  }
};

module.exports = Contracts;
