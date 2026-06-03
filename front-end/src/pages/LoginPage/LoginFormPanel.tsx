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
    <div className="flex h-full min-h-0 flex-col justify-center overflow-y-auto overscroll-contain bg-white px-8 pb-8 pt-9 max-[800px]:justify-start max-[800px]:px-4 max-[800px]:py-5">
      <header className="mb-6 max-[800px]:mb-4">
        <h2 className="m-0 text-xl font-bold tracking-tight text-zinc-900 max-[800px]:text-lg">
          Fazer login
        </h2>
        <p className="mt-2 text-sm text-zinc-500 max-[800px]:mt-1 max-[800px]:text-xs">
          Insira suas credenciais abaixo.
        </p>
      </header>

      <form
        className="flex w-full max-w-md flex-col gap-5 max-[800px]:gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className={fieldGap}>
          <Label htmlFor="login-card" className="text-base font-medium">
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
            className="text-base font-medium leading-none text-zinc-900"
            id={unitGroupId}
          >
            Unidade
          </span>
          <div
            className="grid w-full grid-cols-2 gap-3"
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
              className="h-[var(--control-height,2.5rem)] min-w-0 gap-0 px-3 py-0 text-sm font-semibold leading-none tracking-tight"
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
              className="h-[var(--control-height,2.5rem)] min-w-0 gap-0 px-3 py-0 text-base font-semibold leading-none"
            >
              <span className="min-w-0 max-w-full truncate">TRACTOR</span>
            </Button>
          </div>
          {errors.unit ? (
            <p className="m-0 text-sm text-red-600">{errors.unit.message}</p>
          ) : null}
        </div>

        <div className={fieldGap}>
          <Label htmlFor="login-password" className="text-base font-medium">
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
            className="w-full text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
