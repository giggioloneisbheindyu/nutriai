import Dexie,{type Table} from 'dexie';
export type Provenance='PDF'|'DATABASE'|'STIMA_AI'|'UTENTE';
export type Nutrients={kcal:number|null;protein:number|null;carbs:number|null;fat:number|null};
export type Ingredient={id:string;name:string;grams:number|null;weightState:'crudo'|'cotto'|'non_specificato';nutrients:Nutrients;source:Provenance;sourceDetail?:string;confirmed:boolean};
export type Meal={id:string;name:string;dayType:string;alternatives:Ingredient[][];notes:string;needsReview:boolean};
export type Plan={id:string;name:string;createdAt:string;original:Blob;rawText:string;meals:Meal[];version:number};
export type Entry={id:string;date:string;mealIds:string[];description:string;ingredients:Ingredient[];photo?:Blob;createdAt:string;notes:string};
export type Preference={key:string;value:string};
class NutriDB extends Dexie{plans!:Table<Plan,string>;entries!:Table<Entry,string>;preferences!:Table<Preference,string>;constructor(){super('NutriAI_local_v1');this.version(1).stores({plans:'id,createdAt',entries:'id,date,createdAt',preferences:'key'});}}
export const db=new NutriDB();export const uid=()=>crypto.randomUUID();export const emptyNutrients=():Nutrients=>({kcal:null,protein:null,carbs:null,fat:null});
export function sumNutrients(ingredients:Ingredient[]):Nutrients{const keys=(['kcal','protein','carbs','fat'] as const);const result=emptyNutrients();for(const key of keys){result[key]=ingredients.length>0&&ingredients.every(i=>i.nutrients[key]!==null)?ingredients.reduce((s,i)=>s+(i.nutrients[key]||0),0):null;}return result;}
