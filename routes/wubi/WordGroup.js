// 词条对象 分组
import {Word} from "./Word";

class WordGroup{
    id: number
    groupName: string
    dict: Word[]
    isEditingTitle: boolean

    constructor(id: number, groupName: string, words: Word[], isEditingTitle: boolean) {
        this.id = id
        this.groupName = groupName || ''
        this.dict = words
        this.isEditingTitle = isEditingTitle // 标题是否在编辑
    }
    // 复制一个对象
    clone(){
        return new WordGroup(this.id, this.groupName, [...this.dict], false)
    }
}
export {WordGroup}
