import { error, log, warn } from "cc";
import { EDITOR } from "cc/env";

interface Error {
    name: string;
    message: string;
    stack?: string;
}

/**
 * 日志等级
 *
 * @
 * @enum {number}
 */
export const enum LoggerLevel {
    NONE,
    ERROR,
    WARN,
    INFO,
    DEBUG,
}

/**
 * 日志输出类型
 *
 * @
 * @enum {number}
 */
export const enum LoggerType {
    CONSOLE,
    CUSTOME,
    COCOS,
    File,
}

const loggers = new Map<string, Logger>();
let type = LoggerType.COCOS;
let level = LoggerLevel.INFO;

function consoleTable<T extends object>(data: T[], properties?: (keyof T)[], colors?: Map<string, string>): void {
    if (!data || data.length === 0) {
        console.log('No data to display.');
        return;
    }

    // 如果没有指定属性，则使用对象的所有键
    const keys = properties ? properties : (Object.keys(data[0]) as (keyof T)[]);

    // 打印表头
    // console.log(keys.map(key => (<string>key).padEnd(20)).join('|'));
    // console.log(keys.map(() => '---'.padEnd(20, '-')).join('|'));

    if (colors) {
        let styles = Array.from({ length: keys.length }).map(e => "%c%s").join(" ");
        data.forEach(row => {
            let logs = [styles];
            if (Array.isArray(row)) {
                for (let k = 0; k < row.length; ++k) {
                    let key = row[k];
                    for (const o of colors.entries()) {
                        if (key.toString().includes(o[0])) {
                            logs.push(`color: ${o[1]};background:rgba(211,211,211,255);font-weight:bold`);
                            break;
                        }
                    }

                    logs.push(key.toString().padEnd(20));
                }
            } else {
                for (const o of colors.entries()) {
                    if (o[0].includes(row.toString())) {
                        logs.push(`color: ${o[1]};`);
                        break;
                    }
                }

                logs.push(row.toString().padEnd(20));
            }
            console.log.apply(console, logs);
        });
    } else {
        data.forEach(row => {
            console.log(keys.map(key => String(row[key]).padEnd(20)).join('|'));
        });
    }
}

class PrivateLogger {
    private static stackTrace = function () {
        let obj = {};
        //@ts-ignore
        Error.captureStackTrace(obj, PrivateLogger.stackTrace)
        return (<Error>obj).stack
    }

    private static getLine(stack: string) {
        let matchResult = stack.match(/\(.*?\)|\s.+/g) || []
        let arr = matchResult.map((it: string) => {
            return it.split(' ').pop()!.replace(/\(|\)/g, '')
        })
        return arr[2] ?? ''
    }

    public static log(...info: any[]) {
        switch (type) {
            case LoggerType.CUSTOME:
                PrivateLogger.customLog(info);
                break;
            case LoggerType.COCOS:
                PrivateLogger.cocosLog(info);
                break;
            default:
                PrivateLogger.cocosLog(info);
                break;
        }
    }

    private static customLog(info: any[]) {
        //@ts-ignore
        if (!Error.captureStackTrace) {
            return PrivateLogger.out(info);
        }

        let stack = PrivateLogger.stackTrace() || '';
        let matchResult = PrivateLogger.getLine(stack);

        if (EDITOR) {
            matchResult = "file:///" + matchResult.split("file:/")[2];
        }

        let line = matchResult;
        //@ts-ignore
        arguments[arguments.length - 1] += '  ' + line;
        //@ts-ignore
        log.apply(console, arguments);
    }

    private static cocosLog(info: any[]) {
        log.apply(null, info);
    }

    private static out(...info: any[]) {
        log(info);
    }
}

/**
 * 日志类
 *
 * @export
 * @class Logger
 */
export class Logger {

    /**
     * 获取日志实例
     *
     * @static
     * @param {string} name 日志名称
     * @returns {Logger} 日志实例
     * @memberof Logger
     */
    public static getLogger(name: string): Logger {
        if (loggers.has(name)) {
            return loggers.get(name)!;
        }
        let logger = new Logger(name);
        loggers.set(name, logger);
        return logger;
    }

    private _name: string;
    private _level: LoggerLevel = LoggerLevel.DEBUG;
    constructor(name: string) {
        this._name = name;
    }

    /**
     * 输出调试信息
     *
     * @param {...any[]} info
     * @memberof Logger
     */
    public debug(info: any[]) {
        if (this._level <= LoggerLevel.DEBUG) {
            logger.log.apply(null, ['[DEBUG]', this._name, ...info]);
        }
    }

    /**
     * 输出信息
     *
     * @param {...any[]} info
     * @memberof Logger
     */
    public info(...info: any[]) {
        if (this._level <= LoggerLevel.INFO) {
            logger.log.apply(null, ['[INFO]', this._name, ...info]);
        }
    }

    /**
     * 输出警告信息
     *
     * @param {...any[]} info
     * @memberof Logger
     */
    public warn(...info: any[]) {
        if (this._level <= LoggerLevel.WARN) {
            logger.log.apply(null, ['[WARN]', this._name, ...info]);
        }
    }

    /**
     * 输出错误信息
     *
     * @param {...any[]} info
     * @memberof Logger
     */
    public error(...info: any[]) {
        if (this._level <= LoggerLevel.ERROR) {
            logger.log.apply(null, ['[ERROR]', this._name, ...info]);
        }
    }
}

/**
 * 日志实例
 */
export const logger = {

    /**
     * 输出调试信息
     */
    log: log,
    warn: warn,
    error: error,
    table: consoleTable,

    /**
     * 日志级别
     */
    /**
         * 获取日志级别
         */
    get level() {
        return level;
    },

    /**
     * 设置日志级别
     * @param value 日志级别
     */
    set level(value: LoggerLevel) {
        level = value;
        if (level == LoggerLevel.NONE) {
            this.log = function () { };
            this.warn = function () { };
            this.error = function () { };
            this.table = function () { };
        } else {
            this.error = type == LoggerType.CONSOLE ? console.error : PrivateLogger.log;
            this.warn = type == LoggerType.CONSOLE ? console.warn : PrivateLogger.log;
            this.log = type == LoggerType.CONSOLE ? console.log : PrivateLogger.log;
        }
    },

    /**
     * 日志输出类型
     */
    get type() {
        return type;
    },

    /**
     * 设置日志输出类型
     */
    set type(value: LoggerType) {
        type = value;
        if (type == LoggerType.CONSOLE && level != LoggerLevel.NONE) {
            this.log = console.log;
            this.warn = console.warn;
            this.error = console.error;
        } else {
            this.log = PrivateLogger.log;
            this.warn = PrivateLogger.log;
            this.error = PrivateLogger.log;
        }
    }
}