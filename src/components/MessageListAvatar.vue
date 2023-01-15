<template functional>
    <component
        :is="$options.c.Avatar"
        :network="props.network"
        :user="props.user"
        size="small"
        :message="props.message"
    />
</template>

<script>

'kiwi public';

import Avatar from './Avatar';

// This component simply wraps the Avatar component so that plugins may override this messagelist
// avatar separately than the nicklist avatar
export default {
    c: {
        Avatar,
    },
    props: ['message', 'network', 'user'],
};

</script>
