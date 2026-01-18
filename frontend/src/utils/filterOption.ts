import type { DefaultOptionType } from "antd/es/select";

/**
 * Type-safe filter option handler for Ant Design Select
 * Use this to replace filterOption={(input, option: any) => ...}
 */
export function createFilterOption(
    key: keyof DefaultOptionType = "value"
): (input: string, option: DefaultOptionType | undefined) => boolean {
    return (input: string, option: DefaultOptionType | undefined) => {
        if (!option) return false;
        const value = option[key];
        if (typeof value === "string") {
            return value.toUpperCase().includes(input.toUpperCase());
        }
        return false;
    };
}

/**
 * Simple filter option for Select with value matching
 */
export const filterOptionByValue = createFilterOption("value");

/**
 * Filter option for Select with label matching
 */
export const filterOptionByLabel = createFilterOption("label");
