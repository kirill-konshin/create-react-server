var React = require('react');
var withRouter = require('react-router-dom').withRouter;
var hoistStatics = require('hoist-non-react-statics');
var lib = require('./lib');

function isNode() {
    return (typeof process === 'object' && process + '' === '[object process]');
}

function getDisplayName(Cmp) {
    return Cmp.displayName || Cmp.name || 'Component';
}

function withWrapper(Cmp) {

    var Wrapper = React.createClass({

        displayName: 'WithWrapper',

        contextTypes: {
            store: React.PropTypes.any,
            getInitialProps: React.PropTypes.func
        },

        getInitialState: function getInitialState() {

            var initialProps = this.context.getInitialProps();

            // console.log('Initial props from context', initialProps);

            return lib.extends({}, initialProps || {}, {
                initialLoading: !initialProps, // no props means it will load
                initialError: initialProps && initialProps.initialError && new Error(initialProps.initialError) // it comes as string
            });

        },

        componentWillMount: function componentWillMount() {

            var self = this;

            // On NodeJS setState is a no-op, besides, getInitialProps will be called by server rendering procedure
            if (isNode()) {

                // if (!this.state.initialLoading) return;
                //match, location, history, staticContext

                this.props.staticContext.store = this.context.store; //FIXME Brutal access to Redux Provider's store

                this.props.staticContext.location = this.props.location;

                if (Cmp.getInitialProps) {
                    this.props.staticContext.getInitialProps = Cmp.getInitialProps.bind(Cmp);
                }

                return;

            }

            // On client side this function should not be called if props were passed from server
            if (!this.state.initialLoading) return;

            return new Promise(function(res) {

                res(Cmp.getInitialProps ? Cmp.getInitialProps({
                    location: self.props.location,
                    params: self.props.params,
                    req: null,
                    res: null,
                    store: self.context.store //FIXME Brutal access to Redux Provider's store
                }) : null);

            }).then(function(props) {

                self.setState(lib.extends({}, props, {
                    initialLoading: false,
                    initialError: null
                }));

            }).catch(function onError(e) {

                console.error(Wrapper.displayName + '.getInitialProps has failed:', e);

                self.setState({
                    initialLoading: false,
                    initialError: e
                });

            });

        },

        getInitialProps: function getInitialProps() {

            var self = this;

            return new Promise(function(resolve) {

                if (self.state.initialLoading) {
                    console.warn(Wrapper.displayName + '.getInitialProps is already pending, make sure you won\'t have race condition');
                }

                self.state = {};

                self.setState({
                    initialLoading: true,
                    initialError: null
                }, function() {
                    resolve(self.componentWillMount());
                });

            });

        },

        render: function render() {

            var props = lib.objectWithoutProperties(this.props, ["children"]);

            return React.createElement(
                Cmp,
                //TODO Add mapping function
                lib.extends({getInitialProps: this.getInitialProps}, this.state, props),
                this.props.children
            );

        }

    });

    Wrapper = withRouter(Wrapper);

    Wrapper.displayName = 'withWrapper(' + getDisplayName(Cmp) + ')';
    Wrapper.OriginalComponent = Cmp;

    return hoistStatics(Wrapper, Cmp);

}

var WrapperProvider = React.createClass({

    displayName: 'WrapperProvider',

    propTypes: {
        initialProps: React.PropTypes.any
    },

    defaultProps: {
        initialProps: null
    },

    childContextTypes: {
        getInitialProps: React.PropTypes.func
    },

    getChildContext: function getChildContext() {
        var self = this;
        return {
            getInitialProps: function() {
                var initialProps = self.initialProps;
                self.initialProps = null; // initial props can be used only once
                return initialProps;
            }
        };
    },

    getInitialState: function getInitialState() {
        this.initialProps = this.props.initialProps;
        return {};
    },

    render: function render() {
        return this.props.children;
    }

});

exports.withWrapper = withWrapper;
exports.WrapperProvider = WrapperProvider;