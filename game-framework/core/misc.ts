import { CCClass, Color, Component, EventTouch, Node, Rect, assetManager, view as ccview, director, error, game, isValid, js, screen, sys, warn } from "cc";
import { PREVIEW,DEBUG } from "cc/env";
import { ArgumentsTypeError } from "./error";

export const supportReflect = typeof Reflect !== "undefined";

export const PropertySet = (function () {
    return supportReflect ? Reflect.set : function <T extends object, P extends PropertyKey>(target: T, key: P, value: P extends keyof T ? T[P] : any) {
        (<any>target)[key] = value;
    };
})();

export const PropertyGet = (function () {
    return supportReflect ? Reflect.get : function <T extends object, P extends PropertyKey>(target: T, key: P) {
        return (<any>target)[key];
    };
})();

/**
 * 
 * @returns 
 */
export const makeDeferred = <T>() => {
    let resolve: (value?: T) => void = null!;
    let reject: (reason?: any) => void = null!;
    let promise = new Promise<IGameFramework.Nullable<T>>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });

    return {
        resolve,
        reject,
        promise,
    }
}

export const utils = {
    get isPc(): boolean {
        return sys.platform === sys.Platform.WIN32 ||
            sys.platform === sys.Platform.MACOS ||
            sys.platform === sys.Platform.DESKTOP_BROWSER ||
            sys.os === sys.OS.WINDOWS ||
            sys.os === sys.OS.LINUX ||
            sys.os === sys.OS.OSX;
    },

    // 计算到根节点的距离
    getDistanceToRoot(node: Node) {
        let distance = 0;
        let current = node;
        while (current.parent) {
            distance++;
            current = current.parent;
        }
        return distance;
    },

    getCameraComponent<T extends Component>(comp: IGameFramework.Constructor<T>) {
        const cameras = director.root!.cameraList;
        for (let ia = 0; ia < cameras.length; ++ia) {
            const camera = cameras[ia];
            const com = camera.node.getComponent(comp);
            if (com) {
                return com;
            }
        }
    },

    getMainCamera(name: string = "Main Camera") {
        const cameras = director.root!.cameraList;
        for (let ia = 0; ia < cameras.length; ++ia) {
            const camera = cameras[ia];
            if (camera.node.name === name) {
                return camera;
            }
        }
    },
}

export class Deferred<T = any> {
    public static PENDING = "PENDING";
    public static FULFILLED = "FULFILLED";
    public static REJECTED = "REJECTED";

    public promise: Promise<T>;

    private _resolve: (t: T) => void = null!;
    private _reject: Function = null!;

    public state: string = Deferred.PENDING;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    public fulfilled(value: T) {
        if (this.state !== Deferred.PENDING) return;
        this.state = Deferred.FULFILLED;
        this._resolve(value);
    }

    public rejected(reason: any) {
        if (this.state !== Deferred.PENDING) return;
        this.state = Deferred.REJECTED;
        this._reject(reason);
    }

    public then(func: (value: T) => any) {
        return this.promise.then(func);
    }

    public catch(func: (value: any) => any) {
        return this.promise.catch(func);
    }
}

const getHttp = function <T>(ok: (response: IGameFramework.Nullable<T>) => void) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status < 400)) {
            const response = xhr.response;
            ok(response as T);
        }
    };

    // 超时
    xhr.ontimeout = function (ev: ProgressEvent) {
        ok(null);
    };

    // 异常
    xhr.onerror = function (ev: ProgressEvent) {
        ok(null);
    };

    // 取消
    xhr.onabort = function (ev: ProgressEvent) {
        ok(null);
    };

    return xhr;
}

/**
 * Http请求
 *
 * @export
 * @class HttpReq
 */
export class HttpReq {
    private _domain: string;
    private _timeout: number;

    public constructor(domain: string, timeout: number) {
        this._domain = domain;
        this._timeout = timeout;
    }

    public async requestBinary<T>(handle: string, buffer: Uint8Array): Promise<IGameFramework.Nullable<T>> {
        let r: (value: IGameFramework.Nullable<T>) => void;
        const p = new Promise<IGameFramework.Nullable<T>>(resolve => { r = resolve });
        const request = getHttp((result) => {
            r(result as T);
        });

        this.setUrlAndTimeout(handle, request);
        request.responseType = "arraybuffer";
        request.setRequestHeader("Content-Type", "application/octet-stream");

        request.send(buffer.buffer);
        return await p;
    }

    public async requestJson<T>(handle: string, json: unknown): Promise<IGameFramework.Nullable<T>> {
        let r: (value: IGameFramework.Nullable<T>) => void;
        const p = new Promise<IGameFramework.Nullable<T>>(resolve => { r = resolve });
        const request = getHttp((result) => {
            r(result as T);
        });
        this.setUrlAndTimeout(handle, request);
        request.responseType = "json";
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify(json));
        return await p;
    }

    public async requestText(handle: string, text: string): Promise<IGameFramework.Nullable<string>> {
        let r: (value: IGameFramework.Nullable<string>) => void;
        const p = new Promise<IGameFramework.Nullable<string>>(resolve => { r = resolve });
        const request = getHttp((result) => {
            r(result as string);
        });
        this.setUrlAndTimeout(handle, request);
        request.responseType = "text";
        request.setRequestHeader("Content-Type", 'text/plain');
        request.send(text);
        return await p;
    }

    private setUrlAndTimeout(handle: string, request: XMLHttpRequest): void {
        request.open("POST", this._domain + handle, true);
        request.timeout = this._timeout;
    }
}

export const S2C_MESSAGE = "$s2cmsg";
export const C2S_MESSAGE = "$c2smsg";

/**
 * 等待一定的时间
 * @param time 毫秒
 * @returns 
 */
export const setTimeoutAsync = (time: number) => {
    return new Promise((resolve) => { setTimeout(resolve, time); });
}

/**
 * 随机颜色
 * @param out 
 * @returns 
 */
export const randomHexColor = (out?: Color): Color => {
    const hex = Math.floor(Math.random() * 16777216).toString(16).padStart(6, "0");
    return out ? out.fromHEX('#' + hex) : new Color().fromHEX('#' + hex);
}

/**
 * 空函数
 * 
 * @exports
 */
export const fnEmpty = () => { };

/**
 * 是不是奇数
 */
export const isOdd = (v: number): boolean => {
    if (v == 0) return false;
    return (v & 1) == 1;
}

/**
 * 把单位时间为秒的时间换算成帧数
 * @param t 
 * @returns 
 */
export const secFrame = (t: number) => {
    const rate = parseInt(game.frameRate as string, 10);
    const count = t * rate;
    return count;
};

/**
 * 当前类型实现一个接口
 *
 * @export
 * @template T
 * @param {string} iface
 * @return {*}  {(target: IGameFramework.Constructor<T>) => void}
 */
export function implementation<T>(iface: string): (target: IGameFramework.Constructor<T>) => void {
    return function (target: IGameFramework.Constructor<T>) {
        CCClass.Attr.setClassAttr(target, "gameframework", "interface", iface);

        // 标记为不可序列化
        CCClass.Attr.setClassAttr(target, "gameframework", "serializable", false);
    }
}

/**
 * 判断当前实例是不是实现了该接口
 *
 * @export
 * @template T
 * @param {T} target
 * @param {string} iface 接口
 * @return {*}  {boolean}
 */
export function interfaceOf<T>(target: T, iface: string): boolean {
    let attr = CCClass.attr(target, "gameframework");
    if (attr) {
        return attr["interface"] == iface;
    }

    return false;
}

/**
 * 检查当前实例是否实现了某个接口
 *
 * @export
 * @template T
 * @param {IGameFramework.Constructor<T>} target
 * @return {*}  {boolean}
 */
export function implementationInterface<T>(target: IGameFramework.Constructor<T>): boolean {
    let attr = CCClass.attr(target, "gameframework");
    if (!attr) return false;

    return attr["interface"] == void 0;
}

/**
 * 获取接口
 *
 * @export
 * @template T
 * @param {IGameFramework.Constructor<T>} target
 * @return {*}  {string}
 */
export function getClassInterface<T>(target: IGameFramework.Constructor<T>): string {
    let attr = CCClass.attr(target, "gameframework");
    if (attr) {
        return attr["interface"];
    }

    return "";
}

/**
 * 检查节点是否已被销毁
 *
 * @export
 * @param {Node} node
 * @return {*}  {boolean}
 */
export function isDestroyed(node: Node): boolean {

    // 常规情况下，parent也可以为null吗？在当前设计范围内，parent为null的节点。我们统一认为是不合理的
    return !isValid(node, true) || node.parent == null;
}

/**
 * 检查对象是否为空或undefined
 *
 * @export
 * @template T
 * @param {IGameFramework.Nullable<T>} obj
 * @return {*}  {boolean}
 */
export function isNullOrUndefined<T>(obj: IGameFramework.Nullable<T>): boolean {
    return obj === null || obj === void 0;
}

/**
 * str是否为空字符串
 *
 * @export
 * @param {IGameFramework.Nullable<string>} str
 * @return {*}  {boolean}
 */
export function isEmptyStr(str: IGameFramework.Nullable<string>): boolean {
    return str === "" || isNullOrUndefined(str);
}


/**
 * 获取URL中的参数
 *
 * @export
 * @param {string} urlStr url
 * @param {string} urlKey 参数key
 * @return {string}  
 */
export function getUrlParam(urlStr: string, urlKey: string): string {
    if (isEmptyStr(urlStr)) return "";
    const url = new URL(urlStr)
    const reg = new RegExp('[\?\&]' + urlKey + '=([^\&]*)(\&?)', 'i')
    const r = url.search.match(reg);
    return r ? r[1] : ''
}

/**
 * 请入全屏
 *
 * @export
 */
export function requestFullScreen() {
    if (screen.supportsFullScreen && !screen.fullScreen()) {
        screen.requestFullScreen();
    }
}

/**
 * 在预览下自动进入全屏
 * 
 * 这样可以在手机浏览器上很方便的测试全屏效果
 *
 * @export
 */
export function previewAutoFullScreen() {
    if (PREVIEW && sys.isMobile) {
        if (navigator && navigator.platform && navigator.platform == "Win32") {
            return;
        }
        requestFullScreen();
    }
}

/**
 * 在预览下自动加载vconsole
 * 
 * 这样可以很方便的在手机浏览器上看到日志信息
 *
 * @export
 */
export function previewNewConsole() {
    if (PREVIEW && sys.isMobile && sys.isBrowser) {
        if (navigator && navigator.platform && navigator.platform == "Win32") {
            return;
        }
        vConsoleNew();
    }
}

/**
 * 判断是否为异步函数
 *
 * @export
 * @param {(AsyncGeneratorFunction | Function)} fn
 * @return {*}  {boolean}
 */
export function isAsyncFn(fn: ((...args: any[]) => Promise<void>) | Function): fn is (...args: any[]) => Promise<void> {
    return Object.prototype.toString.call(fn) == '[object AsyncFunction]';
}

/**
 * 加载VConsole
 *
 * @export
 */
export function vConsoleNew() {
    assetManager.loadRemote("https://unpkg.com/vconsole@latest/dist/vconsole.min.js", (err, data) => {
        if (err) {
            error(err)
        }

        // 这里本来是需要创建vconsole实例的，但是不知道怎么的，加载完成后好像已经创建一个实例了
        // new window["VConsole"]();
    });
}

/**
 * 构造一个GUID
 * 
 * @example
 * 'b9aa2bc5-03b8-4940-8476-e02f784057c2'
 *
 * @export
 * @return {*}  {string}
 */
export function guidGenerator(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 构造一个UUID
 * 
 * @example 
 * uuidGenerator(16, 10) = '5407864749245981'
 *
 * @export
 * @param {number} len
 * @param {number} radix
 * @return {*}  
 */
export function uuidGenerator(len?: number, radix?: number): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    const uuid = [];
    let i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

const whRect = ccview.getViewportRect().clone();
const prevRect = whRect.clone();

/**
 * 获取屏幕宽高
 *
 * @export
 * @return {*}  {Rect}
 */
export function getWindowSize(): Rect {
    return whRect;
};
const updateAdaptResult = () => {
    const wh = ccview.getViewportRect();
    whRect.x = wh.x;
    whRect.y = wh.y;
    whRect.width = wh.width / ccview.getScaleX();;
    whRect.height = wh.height / ccview.getScaleY();

    // 发送事件的时候不能太频繁
    if (!wh.equals(prevRect)) {

    }
};

updateAdaptResult();

screen.on("window-resize", updateAdaptResult, this);
screen.on("orientation-change", updateAdaptResult, this);
screen.on("fullscreen-change", updateAdaptResult, this);


/**
 * 递归查询节点名称，子没有就查孙子，无限下去
 * 
 * 算法基于DFS
 *
 * @export
 * @param {Node} node
 * @param {string} name
 * @param {Map<string, Node>} cache
 * @return {*}  {IGameFramework.Nullable<Node>}
 */
export function dfsGetFirstChildByName(node: Node, name: string, cache?: Map<string, Node>): IGameFramework.Nullable<Node> {
    if (node.name == name) return null;
    else if (cache && cache.has(name)) return cache.get(name);

    for (const child of node.children) {
        if (child.name == name) return child;
        else cache && cache.set(child.name, child);

        const result = dfsGetFirstChildByName(child, name, cache);
        if (result) {
            return result;
        }
    }

    return null;
}

/**
 * 递归查询节点名称，子没有就查孙子，无限下去
 * 
 * 算法基于BFS
 *
 * @export
 * @param {Node} node
 * @param {string} name
 * @param {Map<string, Node>} cache
 * @return {*}  {IGameFramework.Nullable<Node>}
 */
export function bfsGetFirstChildByName(node: Node, name: string, cache?: Map<string, Node>): IGameFramework.Nullable<Node> {
    if (node.name == name) return null;
    else if (cache && cache.has(name)) return cache.get(name);

    for (const child of node.children) {
        if (child.name == name) return child;
        else cache && cache.set(child.name, child);
    }

    for (const child of node.children) {
        const find = bfsGetFirstChildByName(child, name, cache)
        if (find) return find;
    }

    return null;
}


/**
 * 向上查询对应的组件，如果找不到就返回null
 *
 * @export
 * @template T
 * @param {Node} node
 * @param {Constructor<T>} component
 * @return {*}  {IGameFramework.Nullable<T>}
 */
export function getComponentInParent<T extends Component>(node: Node, component: IGameFramework.Constructor<T>): IGameFramework.Nullable<T> {
    if (!node) return null;
    const has = node.getComponent(component);
    if (has) return has;
    return getComponentInParent(node.parent!, component);
}

/**
 * 向上查询对应的组件，如果找不到就返回null
 *
 * @export
 * @template T
 * @param {Node} node
 * @param {string} component
 * @return {*}  {IGameFramework.Nullable<T>}
 */
export function getComponentByNameInParent<T extends Component>(node: Node, component: string): IGameFramework.Nullable<T> {
    if (!node) return null;
    const has = node.getComponent(component) as IGameFramework.Nullable<T>;
    if (has) return has;
    return getComponentByNameInParent(node.parent!, component);
}

/**
 * 判断一类型是否是另一类型的子类或本身。
 * 
 * 请确保子类和父类都被ccclass装饰,因为代码混淆会改变类名,所以不能是任意的类型，否则发布前名称是Class，发布后可能是a,b,c等
 *
 * @export
 * @param {Function} subclass
 * @param {string} superclass
 * @return {*}  {boolean}
 */
export function isChildClassOf(subclass: Function, superclass: string): boolean {
    if (subclass && superclass) {
        if (typeof subclass === "object") {
            throw new ArgumentsTypeError("subclass must be a function");
        }

        if (typeof subclass !== 'function') {
            return false;
        }
        if (js.getClassName(subclass) === superclass) {
            return true;
        }
        for (; ;) {
            subclass = js.getSuper(subclass as Function);
            if (!subclass) {
                return false;
            }
            if (js.getClassName(subclass) === superclass) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 随机数
 *
 * @export
 * @class RandomGenerator
 */
export class RandomGenerator {
    private _seed: number;

    public constructor(seed: number) {
        this._seed = seed;
    }

    public next(max: number = 1, min: number = 0): number {
        max = max || 1;
        min = min || 0;

        this._seed = (this._seed * 9301 + 49297) % 233280;
        const rnd = this._seed / 233280;
        return rnd * (max - min) + min;
    }

    public get seed(): number {
        return this._seed;
    }

    public nextInt(max: number = 1, min: number = 0): number {
        return Math.floor(this.next(max, min));
    }

    public clone(): RandomGenerator {
        return new RandomGenerator(this._seed);
    }

    public copy(other: RandomGenerator): void {
        this._seed = other.seed;
    }
}

const touchDisables = new Map<string, {
    __touch_start__: (evt: EventTouch) => boolean;
    __touch_move__: (evt: EventTouch) => boolean;
    __touch_end__: (evt: EventTouch) => boolean;
    __touch_cancel__: (evt: EventTouch) => boolean;
    __touch_delete__: () => void;
}>();
export function touchDisable(node: Node) {
    const has = touchDisables.get(node.uuid);
    if (has) {
        return;
    }

    const uuid = node.uuid;
    let attr = {
        __touch_start__: (evt: EventTouch) => evt.preventSwallow = true,
        __touch_move__: (evt: EventTouch) => evt.preventSwallow = true,
        __touch_end__: (evt: EventTouch) => evt.preventSwallow = true,
        __touch_cancel__: (evt: EventTouch) => evt.preventSwallow = true,
        __touch_delete__: () => touchDisables.delete(uuid)
    };

    node.on(Node.EventType.TOUCH_START, attr.__touch_start__, node);
    node.on(Node.EventType.TOUCH_MOVE, attr.__touch_move__, node);
    node.on(Node.EventType.TOUCH_END, attr.__touch_end__, node);
    node.on(Node.EventType.TOUCH_CANCEL, attr.__touch_cancel__, node);
    node.on(Node.EventType.NODE_DESTROYED, attr.__touch_delete__, node);

    touchDisables.set(uuid, attr);
}

export function touchEnable(node: Node) {
    const attr = touchDisables.get(node.uuid);
    if (!attr) {
        return;
    }

    node.off(Node.EventType.TOUCH_START, attr.__touch_start__, node);
    node.off(Node.EventType.TOUCH_MOVE, attr.__touch_move__, node);
    node.off(Node.EventType.TOUCH_END, attr.__touch_end__, node);
    node.off(Node.EventType.TOUCH_CANCEL, attr.__touch_cancel__, node);
    node.off(Node.EventType.NODE_DESTROYED, attr.__touch_delete__, node);

    touchDisables.delete(node.uuid);
}

/**
 * 待测试函数
 *
 * @export
 */
export function TODOTEST() {
    warn("TODO: 等待测试");
}