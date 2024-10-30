// 词条对象 分组
class WubiWordGroup {
    id = 0
    groupName = ''
    dict =  []
    isEditingTitle =  false // 标题是否在编辑

    constructor(id: number, groupName: string, words: any[], editing = false) {
        this.id = id
        this.groupName = groupName || ''
        this.dict = words || []
        this.isEditingTitle = editing || false // 标题是否在编辑
    }
    // 复制一个对象
    clone(){
        return new WubiWordGroup(this.id, this.groupName, [...this.dict])
    }
}

export default WubiWordGroup
