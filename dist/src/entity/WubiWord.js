"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 词条对象
class WubiWord {
    /**
     *
     * @param id Number ID
     * @param code String 编码
     * @param word String 词条
     * @param priority String 权重
     * @param note String 备注
     */
    constructor(id, code, word, priority, note) {
        this.id = 0;
        this.code = '';
        this.word = '';
        this.priority = '';
        this.note = '';
        this.id = id;
        this.code = code;
        this.word = word;
        this.priority = priority || '';
        this.note = note || '';
    }
    toComparableString() {
        return this.word + '\t' + this.code + '\t' + this.id + '\t' + this.priority + '\t' + this.note;
    }
    toString() {
        return this.id + '\t' + this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note;
    }
    toYamlString() {
        if (this.priority && this.note) {
            return this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note;
        }
        else if (this.priority) {
            return this.word + '\t' + this.code + '\t' + this.priority;
        }
        else if (this.note) {
            return this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note;
        }
        else {
            return this.word + '\t' + this.code;
        }
    }
    toFileString(seperator, codeFirst) {
        if (codeFirst) {
            return this.code + seperator + this.word;
        }
        else {
            return this.word + seperator + this.code;
        }
    }
    setCode(code) {
        this.code = code;
    }
    setId(id) {
        this.id = id;
    }
    // 复制一个对象
    clone() {
        return new WubiWord(this.id, this.code, this.word, this.priority, this.note);
    }
    isEqualTo(word) {
        return this.id === word.id;
    }
    // compare a word to another word
    isContentEqualTo(word) {
        return this.word === word.word && this.code === word.code;
    }
}
exports.default = WubiWord;
