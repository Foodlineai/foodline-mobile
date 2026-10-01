import type { FoodlineApi } from './ports';
import { supabaseApi } from './supabase-adapter';

export const api: FoodlineApi = supabaseApi;

export * from './types';
export type { FoodlineApi } from './ports';
