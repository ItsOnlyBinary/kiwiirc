import { h } from 'vue';

const buildPluginSection = (prop) => (props, context, cache) => {
    kiwi.log.debug("building plugin section....", props, context, cache)
    if (!(props[prop] instanceof Array)) return [];
    if (!props[prop].length) return [];
    const plugins = props[prop].map((plugin) => h(plugin.component, {
        key: plugin.id,
        messagelist: props.ml,
        buffer: props.ml.buffer,
        message: props.message,
        color: props.ml.userColour(props.message.user),
        pluginProps: plugin.props,
        ...(plugin.props || {}),
    }));
    return [h('div', {
        class: `kiwi-messagelist-body kiwi-messagelist-body-${prop}-addons`,
    }, plugins)];
};
export default buildPluginSection;
