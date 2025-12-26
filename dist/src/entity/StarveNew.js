"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobSizeEnum = exports.MobKindEnum = exports.CraftTierEnum = void 0;
/**
 * 制作等级枚举
 */
var CraftTierEnum;
(function (CraftTierEnum) {
    CraftTierEnum["AlwaysAvailable"] = "Always Available";
    CraftTierEnum["ScienceMachine"] = "Science Machine";
    CraftTierEnum["AlchemyEngine"] = "Alchemy Engine";
    CraftTierEnum["Prestihatitator"] = "Prestihatitator";
    CraftTierEnum["ShadowManipulator"] = "Shadow Manipulator";
    CraftTierEnum["AncientPseudoscienceStation"] = "Ancient Pseudoscience Station";
    CraftTierEnum["ObsidianWorkbench"] = "Obsidian Workbench";
    CraftTierEnum["CartographersDesk"] = "Cartographer's Desk";
    CraftTierEnum["RockDen"] = "Rock Den";
    CraftTierEnum["Sketch"] = "Sketch";
    CraftTierEnum["Blueprint"] = "Blueprint";
    CraftTierEnum["GobblerShrine"] = "Gobbler Shrine"; // 火鸡神龛
})(CraftTierEnum || (exports.CraftTierEnum = CraftTierEnum = {}));
/**
 * 生物类型枚举
 */
var MobKindEnum;
(function (MobKindEnum) {
    MobKindEnum["Neutral"] = "neutral";
    MobKindEnum["Friendly"] = "friendly";
    MobKindEnum["Hostile"] = "hostile"; // 敌对
})(MobKindEnum || (exports.MobKindEnum = MobKindEnum = {}));
/**
 * 生物大小枚举
 */
var MobSizeEnum;
(function (MobSizeEnum) {
    MobSizeEnum["Small"] = "small";
    MobSizeEnum["Middle"] = "middle";
    MobSizeEnum["Large"] = "large"; // 大型
})(MobSizeEnum || (exports.MobSizeEnum = MobSizeEnum = {}));
