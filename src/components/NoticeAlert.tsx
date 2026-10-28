import type { ComponentProps, ReactNode } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert";
import { cn } from "../lib/utils";

/**
 * Un aviso de la app con el `Alert` del catálogo: icono, título, detalle opcional, una acción a la derecha (un botón
 * o el de cerrar) y, debajo, un pie opcional (la barra de progreso del escaneo). Lo usan los avisos de actualización,
 * de sincronización, de error, de resultado y el progreso del escaneo.
 */
export function NoticeAlert({
  icon,
  title,
  children,
  action,
  footer,
  className,
  ...props
}: Omit<ComponentProps<typeof Alert>, "title"> & {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Alert
      className={cn(
        "items-center has-[>svg]:grid-cols-[auto_minmax(0,1fr)_auto] has-data-[slot=alert-action]:pr-4",
        className,
      )}
      {...props}
    >
      {icon}
      <AlertTitle className={cn("text-[13px] break-words", !children && "row-span-2 self-center")}>{title}</AlertTitle>
      {children && <AlertDescription className="text-xs">{children}</AlertDescription>}
      {action && (
        <AlertAction className="static col-start-3 row-span-2 row-start-1 flex items-center gap-2 self-center">
          {action}
        </AlertAction>
      )}
      {footer && <div className="col-span-full mt-2">{footer}</div>}
    </Alert>
  );
}
