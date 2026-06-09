import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { Button } from '@/components/ui/brand-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginPayload } from '@/schemas/auth.schema';
import { useLogin } from '@/hooks/useLogin';

const fieldGap = 'space-y-2';

export function LoginFormPanel() {
  const unitGroupId = useId();
  const { mutate, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { card: '', unit: 'pedertractor', password: '' },
  });

  const unit = useWatch({
    control,
    name: 'unit',
    defaultValue: 'pedertractor',
  });
  const passwordRegister = register('password');

  function onSubmit(data: LoginPayload) {
    mutate(data);
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col justify-center overflow-y-auto overscroll-contain bg-white px-8 pb-8 pt-9 max-[767px]:justify-start max-[767px]:px-4 max-[767px]:py-5 min-[768px]:px-4 min-[768px]:py-5 lg:px-8 lg:pb-8 lg:pt-9">
      <header className="mb-6 max-[767px]:mb-4 min-[768px]:mb-4 lg:mb-6">
        <h2 className="m-0 text-xl font-bold tracking-tight text-zinc-900 max-[767px]:text-lg min-[768px]:text-lg lg:text-xl">
          Fazer login
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-[767px]:mt-1 max-[767px]:text-xs min-[768px]:mt-1 min-[768px]:text-xs lg:mt-2 lg:text-sm">
          Insira suas credenciais abaixo.
        </p>
      </header>

      <form
        className="flex w-full min-w-0 max-w-md flex-col gap-5 max-[767px]:gap-4 min-[768px]:max-w-none min-[768px]:gap-3.5 lg:max-w-md lg:gap-5"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className={fieldGap}>
          <Label
            htmlFor="login-card"
            className="text-base font-medium min-[768px]:text-sm lg:text-base"
          >
            Cartão
          </Label>
          <Input
            id="login-card"
            autoComplete="off"
            inputMode="numeric"
            placeholder="Digite o número do cartão"
            aria-invalid={errors.card ? true : undefined}
            {...register('card')}
          />
          {errors.card ? (
            <p className="m-0 text-sm text-red-600">{errors.card.message}</p>
          ) : null}
        </div>

        <div className={fieldGap}>
          <span
            className="text-base font-medium leading-none text-zinc-900 min-[768px]:text-sm lg:text-base"
            id={unitGroupId}
          >
            Unidade
          </span>
          <div
            className="grid w-full min-w-0 grid-cols-2 gap-2 min-[768px]:gap-1.5 lg:gap-3"
            role="group"
            aria-labelledby={unitGroupId}
          >
            <Button
              type="button"
              variant={unit === 'pedertractor' ? 'default' : 'outline'}
              title="PEDERTRACTOR"
              aria-pressed={unit === 'pedertractor'}
              onClick={() =>
                setValue('unit', 'pedertractor', { shouldValidate: true })
              }
              className="h-[var(--control-height,2.5rem)] min-w-0 gap-0 px-3 py-0 text-sm font-semibold leading-none tracking-tight min-[768px]:px-1.5 min-[768px]:text-[10px] lg:px-3 lg:text-sm"
            >
              <span className="min-w-0 max-w-full truncate">PEDERTRACTOR</span>
            </Button>
            <Button
              type="button"
              variant={unit === 'tractor' ? 'default' : 'outline'}
              aria-pressed={unit === 'tractor'}
              onClick={() =>
                setValue('unit', 'tractor', { shouldValidate: true })
              }
              className="h-[var(--control-height,2.5rem)] min-w-0 gap-0 px-3 py-0 text-base font-semibold leading-none min-[768px]:px-1.5 min-[768px]:text-[11px] lg:px-3 lg:text-base"
            >
              <span className="min-w-0 max-w-full truncate">TRACTOR</span>
            </Button>
          </div>
          {errors.unit ? (
            <p className="m-0 text-sm text-red-600">{errors.unit.message}</p>
          ) : null}
        </div>

        <div className={fieldGap}>
          <Label
            htmlFor="login-password"
            className="text-base font-medium min-[768px]:text-sm lg:text-base"
          >
            Senha
          </Label>
          <div className="relative isolate">
            <Input
              id="login-password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              className="pr-[calc(var(--control-height,2.5rem)+0.5rem)]"
              aria-invalid={errors.password ? true : undefined}
              {...passwordRegister}
              type={showPassword ? 'text' : 'password'}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
          {errors.password ? (
            <p className="m-0 text-sm text-red-600">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            size="default"
            className="w-full text-base font-semibold min-[768px]:text-sm lg:text-base"
            disabled={isPending}
          >
            {isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
