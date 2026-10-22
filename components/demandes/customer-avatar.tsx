import { cn } from "cn";
import { avatarClass, initials } from "./request-view";

export function CustomerAvatar({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid size-[34px] flex-none place-items-center rounded-full text-xs font-extrabold",
        avatarClass(id),
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
