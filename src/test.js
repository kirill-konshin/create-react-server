process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason.stack ? reason.stack : reason);
});
