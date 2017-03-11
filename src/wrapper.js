var React = require('react');
var withRouter = require('react-router').withRouter;
var hoistStatics = require('hoist-non-react-statics');
var lib = require('./lib');

var isBrowser = (typeof window !== 'undefined');

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

            return {
                loading: false,
                props: initialProps,
                error: null
            };

        },

        componentWillMount: function componentWillMount() {

            var self = this;

            // On NodeJS setState is a no-op, besides, getInitialProps will be called by server rendering procedure
            // On client side this function should not be called if props were passed from server
            if (!isBrowser || this.state.props) return;

            self.setState({
                loading: true
            });

            new Promise(function(res) {

                res(Cmp.getInitialProps ? Cmp.getInitialProps({
                    location: self.props.location,
                    params: self.props.params,
                    query: self.props.query,
                    req: null,
                    res: null,
                    store: self.context.store
                }) : null);

            }).then(function(props) {

                self.setState({
                    loading: false,
                    props: props,
                    error: null
                });

            }).catch(function onError(e) {

                console.error(Wrapper.displayName + '.getInitialProps has failed:', e);

                self.setState({
                    loading: false,
                    props: null,
                    error: e
                });

            });

        },

        render: function render() {

            var props = lib.objectWithoutProperties(this.props, ["children"]);

            return React.createElement(
                Cmp,
                lib.extends(
                    { //TODO Add mapping function
                        initialError: this.state.error,
                        initialLoading: this.state.loading
                    },
                    this.state.props,
                    props
                ),
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
        return {
            getInitialProps: this.getInitialProps
        };
    },

    getInitialState: function getInitialState() {
        var self = this;
        this.initialProps = this.props.initialProps;
        this.getInitialProps = function() {
            var initialProps = self.initialProps;
            self.initialProps = null; // initial props can be used only once
            return initialProps;
        };
        return {};
    },

    render: function render() {
        return this.props.children;
    }

});

exports.withWrapper = withWrapper;
exports.WrapperProvider = WrapperProvider;