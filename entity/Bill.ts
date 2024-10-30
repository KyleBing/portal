import {formatMoney} from "../config/utility";

interface BillMonth {
    id: number,
    month_id: string, // 202410
    month: string, // 10
    count: number,
    days: Array<BillDay>,
    sum: number,
    sumIncome: number,
    sumOutput: number,
    incomeTop5: Array<BillItem>,
    outcomeTop5: Array<BillItem>,
    food: BillFood
}

interface BillFood{
    breakfast: number,
    launch: number,
    dinner: number,
    supermarket: number,
    fruit: number,
    sum: number
}

interface BillDay {
    id: number,
    month_id: string,
    date: string,
    items: Array<BillItem>,
    sum: number,
    sumIncome: number,
    sumOutput: number
}

interface BillItem {
    item: string,
    price: number
}

export {
    BillMonth, BillFood,
    BillItem,
    BillDay
}
