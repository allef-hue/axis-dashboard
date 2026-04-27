import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../supabase';

export interface UserPermission {
  email: string | null;
  isAdmin: boolean;
  loading: boolean;
}

interface PermissionContextType {
  user: UserPermission;
  canEdit(personEmail?: string): boolean; // true se é admin OU se email do person corresponde
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPermission>({
    email: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    // Carregar usuário e verificar se é admin
    const loadPermissions = async () => {
      try {
        // Obter usuário logado do Supabase Auth
        const { data: { user: authUser } } = await supabase!.auth.getUser();
        const userEmail = authUser?.email || null;

        let isAdmin = false;

        if (userEmail && supabase) {
          // Verificar se está na tabela admins
          try {
            const { data } = await supabase
              .from('admins')
              .select('email')
              .eq('email', userEmail)
              .eq('status', 'active')
              .maybeSingle(); // Não lança erro se não encontra

            isAdmin = !!data;
          } catch (e) {
            // Tabela não existe ainda ou erro na query
            console.warn('Erro ao verificar admin status:', e);
            isAdmin = false;
          }
        }

        setUser({
          email: userEmail,
          isAdmin,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setUser((prev) => ({
          ...prev,
          loading: false,
        }));
      }
    };

    loadPermissions();
  }, []);

  const canEdit = (personEmail?: string): boolean => {
    if (!user.email) return false;
    if (user.isAdmin) return true; // Admin pode editar qualquer um
    if (personEmail && user.email === personEmail) return true; // Usuário pode editar seu próprio card
    return false;
  };

  return (
    <PermissionContext.Provider value={{ user, canEdit }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
}
