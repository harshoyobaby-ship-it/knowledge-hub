"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRole } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserSchema, updateUserSchema } from "@/lib/validations";
import { ROLE_LABELS } from "@/types";

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  jobTitle?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  createdAt?: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRecord | null;
  departments: Department[];
  actorRole: UserRole;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

const createSchema = createUserSchema;
const editSchema = updateUserSchema;

const ALL_ROLES = Object.values(UserRole);

function rolesForActor(actorRole: UserRole): UserRole[] {
  if (actorRole === UserRole.SUPER_ADMIN) return ALL_ROLES;
  if (actorRole === UserRole.ADMIN) {
    return ALL_ROLES.filter((r) => r !== UserRole.SUPER_ADMIN);
  }
  if (actorRole === UserRole.HR) {
    return [
      UserRole.EMPLOYEE,
      UserRole.STUDENT,
      UserRole.TRAINER,
      UserRole.MANAGER,
      UserRole.DEPARTMENT_HEAD,
      UserRole.HR,
      UserRole.GUEST,
    ];
  }
  return [UserRole.EMPLOYEE];
}

const ROLES_REQUIRING_DEPARTMENT: UserRole[] = [
  UserRole.EMPLOYEE,
  UserRole.STUDENT,
  UserRole.TRAINER,
  UserRole.MANAGER,
  UserRole.DEPARTMENT_HEAD,
];

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  departments,
  actorRole,
  onSubmit,
}: UserFormDialogProps) {
  const isEdit = !!user;
  const availableRoles = rolesForActor(actorRole);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: UserRole.EMPLOYEE,
      departmentId: null,
      jobTitle: "",
      phone: "",
      status: "ACTIVE",
    },
  });

  const role = watch("role");
  const departmentId = watch("departmentId");
  const status = watch("status");

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        jobTitle: user.jobTitle || "",
        phone: user.phone || "",
        status: user.status,
      });
    } else {
      reset({
        email: "",
        firstName: "",
        lastName: "",
        role: UserRole.EMPLOYEE,
        departmentId: null,
        jobTitle: "",
        phone: "",
        status: "ACTIVE",
        password: "",
      });
    }
  }, [user, open, reset]);

  async function onFormSubmit(data: Record<string, unknown>) {
    const payload = { ...data };
    if (isEdit && !payload.password) delete payload.password;
    await onSubmit(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add Member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update employee details, role, and department assignment."
              : "Create a new account. Assign Manager role with a department so they can manage content and track team progress."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{isEdit ? "New password (optional)" : "Password"}</Label>
            <Input type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setValue("role", v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setValue("status", v as "ACTIVE" | "INACTIVE" | "SUSPENDED")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Department{" "}
              {ROLES_REQUIRING_DEPARTMENT.includes(role as UserRole)
                ? "(required)"
                : "(optional)"}
            </Label>
            <Select
              value={departmentId || "none"}
              onValueChange={(v) =>
                setValue("departmentId", v === "none" ? null : v, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No department (Admin/HR only)</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && (
              <p className="text-sm text-destructive">{errors.departmentId.message}</p>
            )}
            {(role === UserRole.MANAGER || role === UserRole.DEPARTMENT_HEAD) && (
              <p className="text-xs text-muted-foreground">
                Managers can add content and view employee progress only for this department.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Job title</Label>
              <Input {...register("jobTitle")} placeholder="e.g. Operations Associate" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="+91..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
