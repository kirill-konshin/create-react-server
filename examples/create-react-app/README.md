# Development

Runs Webpack Dev Server, no Server Side Rendering.

```bash
$ npm start
```

# Production + Server Side Rendering

The redeploy sequence is as follows:

1. Build everything
    - Client
    - Server
2. Run the pre-built server with middleware in static (express) mode

```bash
$ npm run build
$ npm run server
```

# Known issues

- [ ] Dynamic `import()` won't work until `react-scripts@0.10.0`
- [ ] Can't have skins because CSS is extracted in one file