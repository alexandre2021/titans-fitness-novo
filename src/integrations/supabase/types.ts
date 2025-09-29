export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome_completo: string | null
          permissoes: string[] | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nome_completo?: string | null
          permissoes?: string[] | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome_completo?: string | null
          permissoes?: string[] | null
        }
        Relationships: []
      }
      alunos: {
        Row: {
          altura: number | null
          avatar_color: string | null
          avatar_image_url: string | null
          avatar_letter: string | null
          avatar_type: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          created_at: string | null
          data_nascimento: string | null
          descricao_pessoal: string | null
          email: string
          endereco: string | null
          genero: string | null
          id: string
          nome_completo: string
          onboarding_completo: boolean | null
          par_q_respostas: Json | null
          peso: number | null
          status: string | null
          telefone: string | null
          ultimo_objetivo_rotina: string | null
          updated_at: string | null
        }
        Insert: {
          altura?: number | null
          avatar_color?: string | null
          avatar_image_url?: string | null
          avatar_letter?: string | null
          avatar_type?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          descricao_pessoal?: string | null
          email?: string
          endereco?: string | null
          genero?: string | null
          id: string
          nome_completo: string
          onboarding_completo?: boolean | null
          par_q_respostas?: Json | null
          peso?: number | null
          status?: string | null
          telefone?: string | null
          ultimo_objetivo_rotina?: string | null
          updated_at?: string | null
        }
        Update: {
          altura?: number | null
          avatar_color?: string | null
          avatar_image_url?: string | null
          avatar_letter?: string | null
          avatar_type?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          descricao_pessoal?: string | null
          email?: string
          endereco?: string | null
          genero?: string | null
          id?: string
          nome_completo?: string
          onboarding_completo?: boolean | null
          par_q_respostas?: Json | null
          peso?: number | null
          status?: string | null
          telefone?: string | null
          ultimo_objetivo_rotina?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_alunos_user_profiles"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos_professores: {
        Row: {
          aluno_id: string
          created_at: string
          professor_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          professor_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_professores_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_professores_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_fisicas: {
        Row: {
          altura: number
          aluno_id: string | null
          braco_direito: number | null
          cintura: number | null
          coxa_direita: number | null
          created_at: string | null
          data_avaliacao: string
          foto_costas_url: string | null
          foto_frente_url: string | null
          foto_lado_url: string | null
          id: string
          imc: number
          observacoes: string | null
          peito_busto: number | null
          peso: number
          quadril: number | null
          updated_at: string | null
        }
        Insert: {
          altura: number
          aluno_id?: string | null
          braco_direito?: number | null
          cintura?: number | null
          coxa_direita?: number | null
          created_at?: string | null
          data_avaliacao: string
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          id?: string
          imc: number
          observacoes?: string | null
          peito_busto?: number | null
          peso: number
          quadril?: number | null
          updated_at?: string | null
        }
        Update: {
          altura?: number
          aluno_id?: string | null
          braco_direito?: number | null
          cintura?: number | null
          coxa_direita?: number | null
          created_at?: string | null
          data_avaliacao?: string
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          id?: string
          imc?: number
          observacoes?: string | null
          peito_busto?: number | null
          peso?: number
          quadril?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_avaliacoes_alunos"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          id: string
          professor_id: string
          email_convidado: string
          token_convite: string
          tipo_convite: string
          status: string | null
          expires_at: string
          aceito_em: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          professor_id: string
          email_convidado: string
          token_convite?: string
          tipo_convite: string
          status?: string | null
          expires_at?: string
          aceito_em?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          professor_id?: string
          email_convidado?: string
          token_convite?: string
          tipo_convite?: string
          status?: string | null
          expires_at?: string
          aceito_em?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_series: {
        Row: {
          carga_dropset: number | null
          carga_executada_1: number | null
          carga_executada_2: number | null
          created_at: string | null
          execucao_sessao_id: string | null
          exercicio_rotina_id: string | null
          id: string
          observacoes: string | null
          repeticoes_executadas_1: number | null
          repeticoes_executadas_2: number | null
          serie_numero: number
        }
        Insert: {
          carga_dropset?: number | null
          carga_executada_1?: number | null
          carga_executada_2?: number | null
          created_at?: string | null
          execucao_sessao_id?: string | null
          exercicio_rotina_id?: string | null
          id?: string
          observacoes?: string | null
          repeticoes_executadas_1?: number | null
          repeticoes_executadas_2?: number | null
          serie_numero: number
        }
        Update: {
          carga_dropset?: number | null
          carga_executada_1?: number | null
          carga_executada_2?: number | null
          created_at?: string | null
          execucao_sessao_id?: string | null
          exercicio_rotina_id?: string | null
          id?: string
          observacoes?: string | null
          repeticoes_executadas_1?: number | null
          repeticoes_executadas_2?: number | null
          serie_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_series_execucao_sessao_id_fkey"
            columns: ["execucao_sessao_id"]
            isOneToOne: false
            referencedRelation: "execucoes_sessao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_series_exercicio_rotina_id_fkey"
            columns: ["exercicio_rotina_id"]
            isOneToOne: false
            referencedRelation: "exercicios_rotina"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_sessao: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_execucao: string | null
          id: string
          modo_execucao: string | null
          observacoes: string | null
          rotina_id: string | null
          sessao_numero: number
          status: string | null
          tempo_decorrido: number | null
          tempo_total_minutos: number | null
          treino_id: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_execucao?: string | null
          id?: string
          modo_execucao?: string | null
          observacoes?: string | null
          rotina_id?: string | null
          sessao_numero: number
          status?: string | null
          tempo_decorrido?: number | null
          tempo_total_minutos?: number | null
          treino_id?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_execucao?: string | null
          id?: string
          modo_execucao?: string | null
          observacoes?: string | null
          rotina_id?: string | null
          sessao_numero?: number
          status?: string | null
          tempo_decorrido?: number | null
          tempo_total_minutos?: number | null
          treino_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_sessao_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "rotinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_sessao_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios: {
        Row: {
          created_at: string | null
          descricao: string | null
          dificuldade: string | null
          equipamento: string | null
          exercicio_padrao_id: string | null
          grupo_muscular: string | null
          grupo_muscular_primario: string | null
          grupos_musculares_secundarios: string | null
          id: string
          imagem_1_url: string | null
          imagem_2_url: string | null
          instrucoes: string | null
          is_ativo: boolean | null
          nome: string
          professor_id: string | null
          slug: string | null
          tipo: string | null
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          dificuldade?: string | null
          equipamento?: string | null
          exercicio_padrao_id?: string | null
          grupo_muscular?: string | null
          grupo_muscular_primario?: string | null
          grupos_musculares_secundarios?: string | null
          id?: string
          imagem_1_url?: string | null
          imagem_2_url?: string | null
          instrucoes?: string | null
          is_ativo?: boolean | null
          nome: string
          professor_id?: string | null
          slug?: string | null
          tipo?: string | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          dificuldade?: string | null
          equipamento?: string | null
          exercicio_padrao_id?: string | null
          grupo_muscular?: string | null
          grupo_muscular_primario?: string | null
          grupos_musculares_secundarios?: string | null
          id?: string
          imagem_1_url?: string | null
          imagem_2_url?: string | null
          instrucoes?: string | null
          is_ativo?: boolean | null
          nome?: string
          professor_id?: string | null
          slug?: string | null
          tipo?: string | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_exercicio_base_id_fkey"
            columns: ["exercicio_padrao_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercicios_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      exercicios_rotina: {
        Row: {
          created_at: string | null
          exercicio_1_id: string
          exercicio_2_id: string | null
          id: string
          intervalo_apos_exercicio: number | null
          observacoes: string | null
          ordem: number
          treino_id: string
        }
        Insert: {
          created_at?: string | null
          exercicio_1_id: string
          exercicio_2_id?: string | null
          id?: string
          intervalo_apos_exercicio?: number | null
          observacoes?: string | null
          ordem: number
          treino_id: string
        }
        Update: {
          created_at?: string | null
          exercicio_1_id?: string
          exercicio_2_id?: string | null
          id?: string
          intervalo_apos_exercicio?: number | null
          observacoes?: string | null
          ordem?: number
          treino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_rotina_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exercicio_1"
            columns: ["exercicio_1_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exercicio_2"
            columns: ["exercicio_2_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_exercicio: {
        Row: {
          id: string
          modelo_treino_id: string
          exercicio_1_id: string
          exercicio_2_id: string | null
          ordem: number
          intervalo_apos_exercicio: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          modelo_treino_id: string
          exercicio_1_id: string
          exercicio_2_id?: string | null
          ordem: number
          intervalo_apos_exercicio?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          modelo_treino_id?: string
          exercicio_1_id?: string
          exercicio_2_id?: string | null
          ordem?: number
          intervalo_apos_exercicio?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_exercicio_modelo_treino_id_fkey"
            columns: ["modelo_treino_id"]
            isOneToOne: false
            referencedRelation: "modelos_treino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelos_exercicio_exercicio_1_id_fkey"
            columns: ["exercicio_1_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modelos_exercicio_exercicio_2_id_fkey"
            columns: ["exercicio_2_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_rotina: {
        Row: {
          id: string
          professor_id: string
          nome: string
          objetivo: string
          dificuldade: string
          treinos_por_semana: number
          duracao_semanas: number
          observacoes_rotina: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          professor_id: string
          nome: string
          objetivo: string
          dificuldade: string
          treinos_por_semana: number
          duracao_semanas: number
          observacoes_rotina?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          professor_id?: string
          nome?: string
          objetivo?: string
          dificuldade?: string
          treinos_por_semana?: number
          duracao_semanas?: number
          observacoes_rotina?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_rotina_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_serie: {
        Row: {
          id: string
          modelo_exercicio_id: string
          numero_serie: number
          repeticoes: number | null
          carga: number | null
          repeticoes_1: number | null
          carga_1: number | null
          repeticoes_2: number | null
          carga_2: number | null
          tem_dropset: boolean | null
          carga_dropset: number | null
          intervalo_apos_serie: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          modelo_exercicio_id: string
          numero_serie: number
          repeticoes?: number | null
          carga?: number | null
          repeticoes_1?: number | null
          carga_1?: number | null
          repeticoes_2?: number | null
          carga_2?: number | null
          tem_dropset?: boolean | null
          carga_dropset?: number | null
          intervalo_apos_serie?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          modelo_exercicio_id?: string
          numero_serie?: number
          repeticoes?: number | null
          carga?: number | null
          repeticoes_1?: number | null
          carga_1?: number | null
          repeticoes_2?: number | null
          carga_2?: number | null
          tem_dropset?: boolean | null
          carga_dropset?: number | null
          intervalo_apos_serie?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_serie_modelo_exercicio_id_fkey"
            columns: ["modelo_exercicio_id"]
            isOneToOne: false
            referencedRelation: "modelos_exercicio"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_treino: {
        Row: {
          id: string
          modelo_rotina_id: string
          nome: string
          grupos_musculares: string[]
          ordem: number
          observacoes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          modelo_rotina_id: string
          nome: string
          grupos_musculares: string[]
          ordem: number
          observacoes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          modelo_rotina_id?: string
          nome?: string
          grupos_musculares?: string[]
          ordem?: number
          observacoes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_treino_modelo_rotina_id_fkey"
            columns: ["modelo_rotina_id"]
            isOneToOne: false
            referencedRelation: "modelos_rotina"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          id: string
          limite_alunos: number | null
          limite_exercicios: number | null
          nome: string
          preco: number
        }
        Insert: {
          ativo?: boolean | null
          id: string
          limite_alunos?: number | null
          limite_exercicios?: number | null
          nome: string
          preco: number
        }
        Update: {
          ativo?: boolean | null
          id?: string
          limite_alunos?: number | null
          limite_exercicios?: number | null
          nome?: string
          preco?: number
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          category: string | null
          content: Json | null
          created_at: string
          id: string
          slug: string
          status: "draft" | "published" | "archived"
          title: string
          updated_at: string | null
          cover_image_desktop_url: string | null
          cover_image_mobile_url: string | null
          excerpt: string | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content?: Json | null
          created_at?: string
          excerpt?: string | null
          id?: string
          slug: string
          status?: "draft" | "published" | "archived"
          title: string
          updated_at?: string | null
          cover_image_desktop_url?: string | null
          cover_image_mobile_url?: string | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: Json | null
          created_at?: string
          excerpt?: string | null
          id?: string
          slug?: string
          status?: "draft" | "published" | "archived"
          title?: string
          updated_at?: string | null
          cover_image_desktop_url?: string | null
          cover_image_mobile_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      professores: {
        Row: {
          anos_experiencia: string | null
          avatar_color: string | null
          avatar_image_url: string | null
          avatar_letter: string | null
          avatar_type: string | null
          bio: string | null
          codigo_pt: string | null
          created_at: string | null
          cref: string | null
          data_nascimento: string | null
          data_plano: string | null
          especializacoes: string[] | null
          facebook: string | null
          genero: string | null
          id: string
          instagram: string | null
          limite_alunos: number | null
          limite_exercicios: number | null
          linkedin: string | null
          nome_completo: string
          onboarding_completo: boolean | null
          plano: Database["public"]["Enums"]["plano_tipo"]
          telefone: string | null
          telefone_publico: boolean | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          anos_experiencia?: string | null
          avatar_color?: string | null
          avatar_image_url?: string | null
          avatar_letter?: string | null
          avatar_type?: string | null
          bio?: string | null
          codigo_pt?: string | null
          created_at?: string | null
          cref?: string | null
          data_nascimento?: string | null
          data_plano?: string | null
          especializacoes?: string[] | null
          facebook?: string | null
          genero?: string | null
          id: string
          instagram?: string | null
          limite_alunos?: number | null
          limite_exercicios?: number | null
          linkedin?: string | null
          nome_completo: string
          onboarding_completo?: boolean | null
          plano?: Database["public"]["Enums"]["plano_tipo"]
          telefone?: string | null
          telefone_publico?: boolean | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          anos_experiencia?: string | null
          avatar_color?: string | null
          avatar_image_url?: string | null
          avatar_letter?: string | null
          avatar_type?: string | null
          bio?: string | null
          codigo_pt?: string | null
          created_at?: string | null
          cref?: string | null
          data_nascimento?: string | null
          data_plano?: string | null
          especializacoes?: string[] | null
          facebook?: string | null
          genero?: string | null
          id?: string
          instagram?: string | null
          limite_alunos?: number | null
          limite_exercicios?: number | null
          linkedin?: string | null
          nome_completo?: string
          onboarding_completo?: boolean | null
          plano?: Database["public"]["Enums"]["plano_tipo"]
          telefone?: string | null
          telefone_publico?: boolean | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      rotinas: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_inicio: string
          descricao: string | null
          dificuldade: string
          duracao_semanas: number
          forma_pagamento: string
          id: string
          nome: string
          objetivo: string | null
          observacoes_pagamento: string | null
          pdf_email_enviado: boolean | null
          permite_execucao_aluno: boolean | null
          professor_id: string
          status: string | null
          treinos_por_semana: number
          valor_total: number
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_inicio: string
          descricao?: string | null
          dificuldade: string
          duracao_semanas: number
          forma_pagamento: string
          id?: string
          nome: string
          objetivo?: string | null
          observacoes_pagamento?: string | null
          pdf_email_enviado?: boolean | null
          permite_execucao_aluno?: boolean | null
          professor_id: string
          status?: string | null
          treinos_por_semana: number
          valor_total: number
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_inicio?: string
          descricao?: string | null
          dificuldade?: string
          duracao_semanas?: number
          forma_pagamento?: string
          id?: string
          nome?: string
          objetivo?: string | null
          observacoes_pagamento?: string | null
          pdf_email_enviado?: boolean | null
          permite_execucao_aluno?: boolean | null
          professor_id?: string
          status?: string | null
          treinos_por_semana?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_rotinas_aluno"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_rotinas_personal"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professores"
            referencedColumns: ["id"]
          },
        ]
      }
      rotinas_arquivadas: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_conclusao: string
          duracao_semanas: number
          id: string
          nome_rotina: string
          objetivo: string
          pdf_url: string
          treinos_por_semana: number
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_conclusao: string
          duracao_semanas: number
          id?: string
          nome_rotina: string
          objetivo: string
          pdf_url: string
          treinos_por_semana: number
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_conclusao?: string
          duracao_semanas?: number
          id?: string
          nome_rotina?: string
          objetivo?: string
          pdf_url?: string
          treinos_por_semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "rotinas_arquivadas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          carga: number | null
          carga_1: number | null
          carga_2: number | null
          carga_dropset: number | null
          created_at: string | null
          exercicio_id: string
          id: string
          intervalo_apos_serie: number | null
          numero_serie: number
          observacoes: string | null
          repeticoes: number
          repeticoes_1: number | null
          repeticoes_2: number | null
          tem_dropset: boolean | null
        }
        Insert: {
          carga?: number | null
          carga_1?: number | null
          carga_2?: number | null
          carga_dropset?: number | null
          created_at?: string | null
          exercicio_id: string
          id?: string
          intervalo_apos_serie?: number | null
          numero_serie: number
          observacoes?: string | null
          repeticoes: number
          repeticoes_1?: number | null
          repeticoes_2?: number | null
          tem_dropset?: boolean | null
        }
        Update: {
          carga?: number | null
          carga_1?: number | null
          carga_2?: number | null
          carga_dropset?: number | null
          created_at?: string | null
          exercicio_id?: string
          id?: string
          intervalo_apos_serie?: number | null
          numero_serie?: number
          observacoes?: string | null
          repeticoes?: number
          repeticoes_1?: number | null
          repeticoes_2?: number | null
          tem_dropset?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "series_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios_rotina"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos: {
        Row: {
          created_at: string | null
          grupos_musculares: string
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          rotina_id: string
          tempo_estimado_minutos: number | null
        }
        Insert: {
          created_at?: string | null
          grupos_musculares: string
          id?: string
          nome: string
          observacoes?: string | null
          ordem: number
          rotina_id: string
          tempo_estimado_minutos?: number | null
        }
        Update: {
          created_at?: string | null
          grupos_musculares?: string
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          rotina_id?: string
          tempo_estimado_minutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treinos_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "rotinas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_type: string
        }
        Insert: {
          created_at?: string | null
          id: string
          updated_at?: string | null
          user_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      delete_user_auth: {
        Args: { user_id: string }
        Returns: boolean
      }
      generate_pt_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      test_checkmail_validation: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          result: Json
        }[]
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      validate_email_with_checkmail: {
        Args: { email_to_validate: string }
        Returns: Json
      }
      verify_user_password: {
        Args: { password: string }
        Returns: boolean
      }
    }
    Enums: {
      plano_tipo: "gratuito"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      plano_tipo: ["gratuito"],
    },
  },
} as const
