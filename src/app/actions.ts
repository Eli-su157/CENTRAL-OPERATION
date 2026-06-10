'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionState = { error: string } | null;

// ---- LOGIN ----

export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) return { error: 'Preencha e-mail e senha.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: 'Credenciais inválidas. Verifique e-mail e senha.' };

  redirect('/app');
}

// ---- CADASTRO DE DONO (cria nova operação) ----

export async function signUpOwner(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const operationName = formData.get('operationName') as string;

  if (!email || !password || !fullName || !operationName) {
    return { error: 'Preencha todos os campos.' };
  }

  if (password.length < 8) {
    return { error: 'A senha deve ter ao menos 8 caracteres.' };
  }

  const admin = createAdminClient();

  // 1. Cria usuário no Supabase Auth (email já confirmado — sem e-mail de verificação)
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    const msg = userError?.message ?? '';
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return { error: 'Este e-mail já está cadastrado.' };
    }
    return { error: 'Erro ao criar conta. Tente novamente.' };
  }

  const userId = userData.user.id;

  // 2. Cria a operação
  const { data: operation, error: opError } = await admin
    .from('operations')
    .insert({ name: operationName, owner_user_id: userId })
    .select()
    .single();

  if (opError || !operation) {
    await admin.auth.admin.deleteUser(userId);
    return { error: 'Erro ao criar operação. Tente novamente.' };
  }

  // 3. Cria o profile do dono
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    operation_id: operation.id,
    full_name: fullName,
    email,
    role: 'dono',
    sector: null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: 'Erro ao configurar perfil. Tente novamente.' };
  }

  // 4. Faz login automaticamente
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    // Conta criada, mas login falhou — usuário pode fazer login manualmente
    return { error: 'Conta criada com sucesso! Faça login para continuar.' };
  }

  redirect('/app');
}

// ---- ACEITAR CONVITE ----

export async function acceptInvite(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!token || !password || !fullName) {
    return { error: 'Preencha todos os campos.' };
  }

  if (password.length < 8) {
    return { error: 'A senha deve ter ao menos 8 caracteres.' };
  }

  const admin = createAdminClient();

  // 1. Valida o convite
  const { data: invite, error: inviteError } = await admin
    .from('invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pendente')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (inviteError || !invite) {
    return { error: 'Convite inválido ou expirado.' };
  }

  // 2. Cria o usuário
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    const msg = userError?.message ?? '';
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return { error: 'Este e-mail já possui uma conta.' };
    }
    return { error: 'Erro ao criar conta.' };
  }

  const userId = userData.user.id;

  // 3. Cria o profile já vinculado à operação do convite
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    operation_id: invite.operation_id,
    full_name: fullName,
    email: invite.email,
    role: invite.role,
    sector: invite.sector,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: 'Erro ao configurar perfil.' };
  }

  // 4. Marca o convite como aceito
  await admin.from('invites').update({ status: 'aceito' }).eq('id', invite.id);

  // 5. Faz login
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: invite.email, password });

  redirect('/app');
}

// ---- LOGOUT ----

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
