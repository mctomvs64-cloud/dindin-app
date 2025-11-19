import { z } from 'zod';

// Transaction validation schema
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number()
    .positive({ message: "O valor deve ser positivo" })
    .max(1000000000, { message: "Valor muito grande" })
    .refine((val) => !isNaN(val), { message: "Valor inválido" }),
  description: z.string()
    .min(1, { message: "Descrição é obrigatória" })
    .max(500, { message: "Descrição muito longa (máx. 500 caracteres)" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida" }),
  notes: z.string().max(1000, { message: "Notas muito longas (máx. 1000 caracteres)" }).optional(),
  category_id: z.string().optional(),
  project_id: z.string().optional(),
});

// Fixed bill validation schema
export const fixedBillSchema = z.object({
  name: z.string()
    .min(1, { message: "Nome é obrigatório" })
    .max(200, { message: "Nome muito longo (máx. 200 caracteres)" }),
  description: z.string()
    .max(1000, { message: "Descrição muito longa (máx. 1000 caracteres)" })
    .optional(),
  amount: z.coerce.number()
    .positive({ message: "O valor deve ser positivo" })
    .max(1000000000, { message: "Valor muito grande" })
    .refine((val) => !isNaN(val), { message: "Valor inválido" }),
  due_day: z.coerce.number()
    .int({ message: "Dia deve ser um número inteiro" })
    .min(1, { message: "Dia deve ser entre 1 e 31" })
    .max(31, { message: "Dia deve ser entre 1 e 31" }),
  frequency: z.enum(['monthly', 'yearly', 'custom']),
  notify_before_days: z.coerce.number()
    .int({ message: "Deve ser um número inteiro" })
    .min(0, { message: "Deve ser no mínimo 0" })
    .max(30, { message: "Deve ser no máximo 30 dias" }),
  auto_repeat: z.boolean(),
  category_id: z.string().optional(),
});

// Goal validation schema
export const goalSchema = z.object({
  name: z.string()
    .min(1, { message: "Nome é obrigatório" })
    .max(200, { message: "Nome muito longo (máx. 200 caracteres)" }),
  description: z.string()
    .max(1000, { message: "Descrição muito longa (máx. 1000 caracteres)" })
    .optional(),
  target_amount: z.coerce.number()
    .positive({ message: "O valor deve ser positivo" })
    .max(1000000000, { message: "Valor muito grande" })
    .refine((val) => !isNaN(val), { message: "Valor inválido" }),
  current_amount: z.coerce.number()
    .min(0, { message: "O valor deve ser no mínimo 0" })
    .max(1000000000, { message: "Valor muito grande" })
    .refine((val) => !isNaN(val), { message: "Valor inválido" }),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida" }),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data inválida" }).optional().or(z.literal('')),
  category_id: z.string().optional(),
  project_id: z.string().optional(),
});

// Project validation schema
export const projectSchema = z.object({
  name: z.string()
    .min(1, { message: "Nome é obrigatório" })
    .max(200, { message: "Nome muito longo (máx. 200 caracteres)" }),
  description: z.string()
    .max(1000, { message: "Descrição muito longa (máx. 1000 caracteres)" })
    .optional(),
  target_amount: z.coerce.number()
    .positive({ message: "O valor deve ser positivo" })
    .max(1000000000, { message: "Valor muito grande" })
    .refine((val) => !isNaN(val), { message: "Valor inválido" })
    .optional()
    .or(z.literal('')),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Cor inválida" }),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  folder_id: z.string().optional(),
});

// Folder validation schema
export const folderSchema = z.object({
  name: z.string()
    .min(1, { message: "Nome é obrigatório" })
    .max(200, { message: "Nome muito longo (máx. 200 caracteres)" }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Cor inválida" }),
});
