import { resolveDepartmentName } from "@/lib/department-scope";

interface LockedDepartmentFieldProps {
  departmentId: string;
  departmentName?: string | null;
  departments: { id: string; name: string }[];
}

export function LockedDepartmentField({
  departmentId,
  departmentName,
  departments,
}: LockedDepartmentFieldProps) {
  const name = resolveDepartmentName(departmentId, departments, departmentName);

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">Department: </span>
      <span className="font-medium">{name}</span>
    </div>
  );
}
