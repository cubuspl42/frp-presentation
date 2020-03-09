import { MillisecondsTimerSystem, Cell, StreamSink, Operational, CellLoop, Transaction } from 'sodiumjs';

import './index.css';
import { runInThisContext } from 'vm';

const sys = new MillisecondsTimerSystem();

function tick() {
    sys.time.sample();
    requestAnimationFrame(tick);
}

tick();

class Vec2 {
    readonly x: number;
    readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    equals(v: Vec2): boolean {
        return this.x == v.x && this.y == v.y;
    }

    mul(a: number) {
        return new Vec2(this.x * a, this.y * a);
    }

    div(a: number) {
        return new Vec2(this.x / a, this.y / a);
    }
}

Transaction.run(() => {
    const speedUpSink = new StreamSink<void>();
    const speedDownSink = new StreamSink<void>();

    const speedUpButton = document.getElementById('speedUp')!;
    speedUpButton.addEventListener('click', () => speedUpSink.send(), false);

    const speedDownButton = document.getElementById('speedDown')!;
    speedDownButton.addEventListener('click', () => speedDownSink.send(), false);

    const speed = speedUpSink.mapTo(0.1)
        .orElse(speedDownSink.mapTo(-0.1))
        .accum(1, (d, s) => s + d);

    const timeLoop = new CellLoop<number>();
    const timeP = sys.time.lift(timeLoop, (st, t) => [st, t] as [number, number]);
    const timeP0 = Operational.value(speed).snapshot1(timeP).hold([0, 0]);
    const time = sys.time.lift3(timeP0, speed, (st, [st0, t0], s) => t0 + (st - st0) * s);
    timeLoop.loop(time);

    const xmlns = "http://www.w3.org/2000/svg";
    const xlink = "http://www.w3.org/1999/xlink";

    function circle(position: Cell<Vec2>, radius: Cell<number>): Element {
        const element = document.createElementNS(xmlns, "circle");
        element.setAttributeNS(null, "fill", 'lightgrey');
        element.setAttributeNS(null, "stroke-width", '4');
        element.setAttributeNS(null, "stroke", 'grey');

        position.listen((p) => {
            element.setAttributeNS(null, "cx", `${p.x}`);
            element.setAttributeNS(null, "cy", `${p.y}`);
        });

        radius.listen((r) => {
            element.setAttributeNS(null, "r", `${r}`);
        });

        return element;
    }

    function image(rotation: Cell<number>): Element {
        const element = document.createElementNS(xmlns, "image");

        element.setAttributeNS(null, "width", '100');
        element.setAttributeNS(null, "height", '100');
        element.setAttributeNS(xlink, "href", 'earth.png');

        rotation.listen((r) => {
            element.setAttributeNS(null, "transform", `translate(-50, -50) rotate(${r} 100 100)`);
        });

        element.classList.add('earth');

        return element;
    }

    const root = document.getElementById('root')!;

    const position = time.map((t) => {
        const t_ = t * 2 * Math.PI / 1000;
        return new Vec2(Math.sin(t_), Math.cos(t_)).mul(100);
    });

    const radius = time.map((t) => 25 + 10 * Math.sin(t / 100));

    root.appendChild(circle(position, radius));

    const rotation = time.map((t) => (t * 360 / 1000) % 360);

    root.appendChild(image(rotation));
});
