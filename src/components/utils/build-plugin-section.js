import { h } from 'vue';

const buildPluginSection = (prop) => (props, context, cache) => {
    let plugins = [];
    if (!(props[prop] instanceof Array)) plugins = [];
    if (!props[prop].length) plugins = [];
    else {
        plugins = props[prop].map((plugin) => h(plugin.component, {
            key: plugin.id,
            // props: {
            messagelist: props.ml,
            buffer: props.ml.buffer,
            message: props.message,
            color: props.ml.userColour(props.message.user),
            // },
        }));
    }
    return [h('div', {
        class: `kiwi-messagelist-body kiwi-messagelist-body-${prop}-addons`,
    }, plugins)];
};
export default buildPluginSection;
