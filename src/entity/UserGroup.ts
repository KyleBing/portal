class UserGroup{
    id = 0          // key: 级别 ID
    name = ''        // 级别名称
    description = '' // 描述
    constructor(id: number, name: string, description: string) {
        this.id = id          // key: 级别 ID
        this.name = name        // 级别名称
        this.description = description // 描述
    }
}
export default UserGroup
