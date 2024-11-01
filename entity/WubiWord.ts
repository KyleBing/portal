// 词条对象
import WubiDict from "entity/WubiDict";

class WubiWord {
    id = 0
    code = ''
    word = ''
    priority: string | number = ''
    note = ''

    /**
     *
     * @param id Number ID
     * @param code String 编码
     * @param word String 词条
     * @param priority String 权重
     * @param note String 备注
     */
    constructor(id: number, code: string, word: string, priority: number | string, note: string) {
        this.id = id
        this.code = code
        this.word = word
        this.priority = priority || ''
        this.note = note || ''
    }
    toComparableString(){
        return this.word + '\t' + this.code + '\t' + this.id  + '\t' + this.priority + '\t' + this.note
    }
    toString(){
        return this.id + '\t' + this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note
    }
    toYamlString(){
        if (this.priority && this.note){
            return this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note
        } else if (this.priority){
            return this.word + '\t' + this.code + '\t' + this.priority
        } else if (this.note){
            return this.word + '\t' + this.code + '\t' + this.priority + '\t' + this.note
        } else {
            return this.word + '\t' + this.code
        }
    }
    toFileString(seperator, codeFirst){
        if (codeFirst){
            return this.code + seperator + this.word
        } else {
            return this.word + seperator + this.code
        }
    }
    setCode(code: string){
        this.code = code
    }
    setId(id: number){
        this.id = id
    }
    // 复制一个对象
    clone(){
        return new WubiWord(this.id, this.code, this.word, this.priority, this.note)
    }
    isEqualTo(word: WubiWord){
        return this.id === word.id
    }
    // compare a word to another word
    isContentEqualTo(word: WubiWord){
        return this.word === word.word && this.code === word.code
    }
}

export default WubiWord
