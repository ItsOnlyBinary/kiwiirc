<template>
    <div class="kiwi-wrap kiwi-wrap-error">
        <img src="../res/salvadorkatz_kiwi.png" alt="" title="deviantart.com/salvadorkatz">
        <h2>There was a problem starting <span class="kiwi-name">Kiwi IRC</span></h2>
        <span>{{ error }}</span>
    </div>
</template>

<script>
'kiwi public';

export default {
    props: ['error'],
};

</script>

<style lang="less">
.kiwi-wrap.kiwi-wrap-error {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow: hidden;
    color: #000;

    .kiwi-name {
        color: #379a79;
    }

    > img {
        max-width: 90vw;
        max-height: 60vh;
    }

    > span {
        display: inline-block;
        padding: 1em;
        margin: 0.5em 1em 0;
        font-size: 1.2em;
        text-align: left;
        background: #ffbaba;
        border: 2px solid #b51111;
    }
}
</style>
