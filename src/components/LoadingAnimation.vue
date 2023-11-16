<template>
    <div>
        <img
            ref="kiwi-loading-logo"
            src="../res/kiwiLoadingLogo.png"
            class="kiwi-loading-logo"
            alt=""
        >
        <canvas ref="kiwi-loading-canvas" class="kiwi-loading-animation" />
    </div>
</template>

<script>

'kiwi public';

export default {
    props: {
        speed: {
            type: Number,
            default: 100,
        },
        text: {
            type: String,
            default: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce eu arcu ipsum.',
            validate: (str) => str.length,
        },
    },
    data() {
        return {
            logo: null,
            canvas: null,
            context: null,
            y: [],
            time: 0,
            lines: [],
            fontSize: 72,
            font: 'bold ' + 72 + 'px verdana',
            animationFrame: null,
            destroying: false,
        };
    },
    mounted() {
        this.canvas = this.$refs['kiwi-loading-canvas'];
        this.canvas.width = 1256;
        this.canvas.height = 1080;

        this.context = this.canvas.getContext('2d');

        this.logo = this.$refs['kiwi-loading-logo'];
        this.logo.onload = () => {
            if (this.destroying) {
                // the component has already been destroyed,
                // we no longer need the animation
                return;
            }
            this.draw();
        };

        let tmpText = '';
        while (tmpText.length < 688) {
            tmpText += this.text + ' ';
        }
        this.lines = String(tmpText).match(/.{1,43}/g);
        for (let i = 0; i < this.lines.length; i += 1) {
            this.y.push(i * this.fontSize - 1600);
        }
    },
    beforeDestroy() {
        this.destroying = true;
        cancelAnimationFrame(this.animationFrame);
    },
    methods: {
        draw() {
            const speed = 100 / (this.speed || 1);
            const textLen = this.lines.length;

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = 'source-over';
            this.context.drawImage(this.logo, 0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = 'xor';
            this.context.fillStyle = '#000';
            this.context.font = this.font;
            for (let i = 0; i < textLen; i += 1) {
                if (this.time % 4.5 < 2) {
                    this.y[i] += (250 + ((10 + i) / textLen) * 4000) / Math.round(120 * speed);
                    if (this.y[i] > i * this.fontSize) {
                        this.y[i] = i * this.fontSize;
                    }
                } else {
                    if (textLen - (this.time % 4.5 - 2) / 2.5 * textLen * 1.75 < i) {
                        this.y[i] += 10 + this.y[i] / Math.round(20 * speed);
                    }
                    if (this.y[i] > 1080 || this.y[i] < 0) {
                        this.y[i] = -1500 + i * this.fontSize;
                    }
                }
                if (this.y[i] > -100) {
                    this.context.fillText(this.lines[i], 0, this.fontSize + this.y[i]);
                }
            }
            this.context.globalCompositeOperation = 'source-out';
            this.context.drawImage(this.logo, 0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = 'source-over';
            this.context.globalAlpha = 0.1;
            this.context.drawImage(this.logo, 0, 0, this.canvas.width, this.canvas.height);
            this.context.globalAlpha = 1;
            this.animationFrame = requestAnimationFrame(this.draw);
            this.time += 1 / Math.round(40 * speed);
        },
    },
};
</script>

<style>
.kiwi-loading-logo {
    display: none;
}

.kiwi-loading-animation {
    height: 100%;
    width: 100%;
}
</style>
