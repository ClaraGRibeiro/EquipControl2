import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
export function DialogContent({className,children,...props}:ComponentProps<typeof DialogPrimitive.Content>){return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm data-[state=open]:animate-in"/><DialogPrimitive.Content className={cn('fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-xl border bg-white p-6 shadow-xl',className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4"/><span className="sr-only">Fechar</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>}
