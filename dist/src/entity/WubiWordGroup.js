"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 词条对象 分组
class WubiWordGroup {
    constructor(id, groupName = '', words = [], editing = false) {
        this.id = 0;
        this.groupName = '';
        this.dict = [];
        this.isEditingTitle = false; // 标题是否在编辑
        this.id = id;
        this.groupName = groupName;
        this.dict = words;
        this.isEditingTitle = editing || false; // 标题是否在编辑
    }
    // 复制一个对象
    clone() {
        return new WubiWordGroup(this.id, this.groupName, [...this.dict]);
    }
}
exports.default = WubiWordGroup;
