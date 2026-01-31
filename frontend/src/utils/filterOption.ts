import type { DefaultOptionType } from "antd/es/select";

/**
 * Type-safe filter option handler for Ant Design Select
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
