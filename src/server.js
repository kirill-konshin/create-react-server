#!/usr/bin/env node

var debug = false;

try {

    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

    require('babel-register');

    var path = require('path');
    var fs = require('fs');
    var createExpressServer = require('./index').createExpressServer;
    var cwd = process.cwd();

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection:', debug && reason.stack ? reason.stack : reason.toString());
    });

    var argv = require('yargs')
        .usage(
            'Usage: $0 --createRoutes path-to-router.js [...options]\n\n' +
            'All specified JS files must export functions as default export or as module.exports.\n' +
            'All options except --createRoutes are not required.'
        )
        .help()
        .version(function() {
            return require('../package.json').version;
        })
        .alias('version', 'v')
        .wrap(null)
        .group(['createRoutes', 'createStore', 'template'], 'JS Files')
        .group(['outputPath', 'templatePath'], 'Paths')
        .option('createRoutes', {
            demandOption: true,
            alias: 'r',
            describe: 'JS file with createRoutes() function '
        })
        .option('createStore', {
            alias: 's',
            describe: 'JS file with createStore() function'
        })
        .option('template', {
            alias: 't',
            describe: 'JS file with template() function'
        })
        .option('outputPath', {
            alias: 'o',
            describe: 'Path to directory with static files',
            default: 'build'
        })
        .option('templatePath', {
            alias: 'i', // because index
            describe: 'Path to index.html',
            default: 'build/index.html',
        })
        .option('port', {
            alias: 'p',
            describe: 'Port to listen',
            default: 3000,
            type: 'number'
        })
        .option('debug', {
            alias: 'd',
            describe: 'Emit some extra request handling information',
            default: false,
            type: 'boolean'
        })
        .argv;

    function getFunction(pathRel, type) {

        var pathAbs = path.join(cwd, pathRel);
        if (!fs.existsSync(pathAbs)) throw new Error(type + ' file "' + pathAbs + '" not found');

        var creator = require(pathAbs);

        console.log(type + ':', pathAbs);

        var result = creator.default || creator;

        if (!result) throw new Error(type + ' did not export anything via default export or module.exports');
        if (typeof result !== 'function') throw new Error(type + ' export is expected to be a function but got ' + (typeof result));

        return result;

    }

    debug = argv.debug;

    // Make paths absolute
    var outputPath = path.join(cwd, argv.outputPath);
    var templatePath = path.join(cwd, argv.templatePath);

    // Functions
    var createRoutes = getFunction(argv.createRoutes, 'Router');
    var createStore = argv.createStore ? getFunction(argv.createStore, 'Redux Store') : null;
    var template = argv.template ? getFunction(argv.template, 'Template') : null;

    console.log('Static:', outputPath);
    console.log('Template Path:', templatePath);

    createExpressServer({
        createRoutes: createRoutes,
        createStore: function(config) {
            return createStore(undefined, config);
        },
        template: template,
        outputPath: outputPath,
        templatePath: templatePath,
        port: argv.port,
        debug: argv.debug
    });

} catch (e) {

    console.error(e.stack && debug ? e.stack : e.toString());
    console.error('Use "create-react-server --help"');
    process.exit(1);

}
