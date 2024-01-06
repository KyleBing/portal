// 词条对象
class Word{
    id: number
    code: string
    word: string
    priority: number | ''
    note: string
    constructor(id: number, code: string, word: string, priority: number, note: string) {
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
    toFileString(seperator: string, codeFirst: boolean){
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
        return new Word(this.id, this.code, this.word, this.priority, this.note)
    }
    isEqualTo(word: Word){
        return this.id === word.id
    }
    // compare a word to another word
    isContentEqualTo(word: Word){
        return this.word === word.word && this.code === word.code
    }
}

export {
    Word
}
