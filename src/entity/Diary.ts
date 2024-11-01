interface Diary {
    id: number,
    date: string,                 // 日记日期,
    title: string,                // 标题,
    content: string,              // 内容,
    temperature: number,          // 室内温度,
    temperature_outside: number,  // 室外温度,
    weather: EnumWeather,
    category: string,             // 类别,
    date_create: string,          // 创建日期,
    date_modify: string,          // 编辑日期,
    uid: number,                  // 用户id,
    is_public: number,            // 是否共享,
    is_markdown: number,          // Markdown,
}

// 账单返回日记内容，多加了几个字段
interface DiaryBill extends Diary{
    month: string, // 10
    month_id: string, // 202410
}

interface DiaryCategory {
    sort_id: number,              // 排序数字,
    name_en: string,              // 类别英文名,
    name: string,                 // 类别名,
    count: number,                // 类别日记的数量,
    color: string,                // 类别颜色,
    date_init: string,            // 创建时间
}

enum EnumWeather {
    sunny,
    cloudy,
    overcast,
    sprinkle,
    rain,
    thunderstorm,
    fog,
    snow,
    tornado,
    smog,
    sandstorm
}

export {
    Diary, DiaryBill,
    DiaryCategory,

    EnumWeather,
}
