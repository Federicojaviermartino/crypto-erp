import { DurationUnit, FractionUnit, InformationUnit } from './types-hoist/measurement';
export type RawAttributes<T> = T & ValidatedAttributes<T>;
export type RawAttribute<T> = T extends {
    value: any;
} | {
    unit: any;
} ? AttributeObject : T;
export type Attributes = Record<string, TypedAttributeValue>;
export type AttributeValueType = string | number | boolean | Array<string> | Array<number> | Array<boolean>;
type AttributeTypeMap = {
    string: string;
    integer: number;
    double: number;
    boolean: boolean;
    'string[]': Array<string>;
    'integer[]': Array<number>;
    'double[]': Array<number>;
    'boolean[]': Array<boolean>;
};
type AttributeUnion = {
    [K in keyof AttributeTypeMap]: {
        value: AttributeTypeMap[K];
        type: K;
    };
}[keyof AttributeTypeMap];
export type TypedAttributeValue = AttributeUnion & {
    unit?: AttributeUnit;
};
export type AttributeObject = {
    value: unknown;
    unit?: AttributeUnit;
};
type AttributeUnit = DurationUnit | InformationUnit | FractionUnit;
export type ValidatedAttributes<T> = {
    [K in keyof T]: T[K] extends {
        value: any;
    } | {
        unit: any;
    } ? AttributeObject : unknown;
};
/**
 * Type-guard: The attribute object has the shape the official attribute object (value, type, unit).
 * https://develop.sentry.dev/sdk/telemetry/scopes/#setting-attributes
 */
export declare function isAttributeObject(maybeObj: unknown): maybeObj is AttributeObject;
/**
 * Converts an attribute value to a typed attribute value.
 *
 * Does not allow mixed arrays. In case of a mixed array, the value is stringified and the type is 'string'.
 * All values besides the supported attribute types (see {@link AttributeTypeMap}) are stringified to a string attribute value.
 *
 * @param value - The value of the passed attribute.
 * @returns The typed attribute.
 */
export declare function attributeValueToTypedAttributeValue(rawValue: unknown): TypedAttributeValue;
export {};
//# sourceMappingURL=attributes.d.ts.map
