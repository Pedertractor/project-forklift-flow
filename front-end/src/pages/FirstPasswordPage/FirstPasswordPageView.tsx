import { EyeIcon } from '@/components/icons/EyeIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { FirstPasswordPageViewModel } from './useFirstPasswordPage';

const fieldGap = 'space-y-2';

export function FirstPasswordPageView(vm: FirstPasswordPageViewModel) {
  const { user, form, onSubmit, mut } = vm;
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex min-h-svh flex-col bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-4">
        <p className="m-0 text-sm font-bold uppercase tracking-wider text-brand">
          ForkLift Flow
        </p>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border border-zinc-200 p-8 shadow-lg">
          <h1 className="m-0 text-xl font-bold tracking-tight text-zinc-900">
            Definir nova senha
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Este é o seu primeiro acesso. Escolha uma nova senha para continuar.
            Depois você será direcionado ao início do sistema.
          </p>
          {user?.name ? (
            <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              Conta:{' '}
              <span className="font-semibold text-zinc-900">{user.name}</span>
            </p>
          ) : null}

          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={onSubmit}
            noValidate
          >
            <div className={fieldGap}>
              <Label htmlFor="fp-new">Nova senha</Label>
              <div className="relative">
                <Input
                  id="fp-new"
                  type={showA ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={errors.newPassword ? true : undefined}
                  className="pr-11"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                  onClick={() => setShowA((v) => !v)}
                  aria-label={showA ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showA ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.newPassword ? (
                <p className="m-0 text-sm text-red-600">
                  {errors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div className={fieldGap}>
              <Label htmlFor="fp-confirm">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="fp-confirm"
                  type={showB ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={errors.confirmPassword ? true : undefined}
                  className="pr-11"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                  onClick={() => setShowB((v) => !v)}
                  aria-label={
                    showB ? 'Ocultar confirmação' : 'Mostrar confirmação'
                  }
                >
                  {showB ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p className="m-0 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            {mut.isError ? (
              <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {mut.error instanceof Error
                  ? mut.error.message
                  : 'Não foi possível alterar a senha.'}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={mut.isPending}>
              {mut.isPending ? 'Salvando…' : 'Salvar e entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
