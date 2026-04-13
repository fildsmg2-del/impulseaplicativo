export interface StageConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  objective: string;
  checklist: { key: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}

export type InstallationType = 'URBANO' | 'RURAL' | 'CNPJ';
export type ProjectStatus = 'VENDAS' | 'FINANCEIRO' | 'COMPRAS' | 'ENGENHEIRO' | 'TECNICO' | 'POS_VENDA';

export type ChecklistItem = { key: string; label: string };

export type ProjectChecklistTemplate = {
  stages: Partial<
    Record<
      ProjectStatus,
      {
        checklist?: ChecklistItem[];
        checklistByInstallationType?: Partial<Record<InstallationType, ChecklistItem[]>>;
      }
    >
  >;
};

const DEFAULT_VENDAS_CHECKLISTS: Record<InstallationType, ChecklistItem[]> = {
  URBANO: [
    { key: 'ven_urb_contrato_assinado', label: 'Contrato Assinado' },
    { key: 'ven_urb_documento_cliente_foto', label: 'documento do cliente com foto (CNH ou RG e CPF)' },
    { key: 'ven_urb_fatura_energia', label: 'fatura de energia do local de instalação' },
    { key: 'ven_urb_link_localizacao', label: 'anexar link de localização' },
    { key: 'ven_urb_foto_padrao_disjuntor', label: 'foto do padrão de entrada e disjuntor' },
  ],
  RURAL: [
    { key: 'ven_rural_contrato_assinado', label: 'Contrato Assinado' },
    { key: 'ven_rural_documento_cliente_foto', label: 'documento do cliente com foto (CNH ou RG e CPF)' },
    { key: 'ven_rural_fatura_energia', label: 'fatura de energia do local de instalação' },
    { key: 'ven_rural_link_localizacao', label: 'anexar link de localização' },
    { key: 'ven_rural_foto_padrao_disjuntor', label: 'foto do padrão de entrada e disjuntor' },
    { key: 'ven_rural_cadastro_ambiental', label: 'cadastro ambiental rural' },
    { key: 'ven_rural_escritura_imovel', label: 'escritura do imóvel' },
  ],
  CNPJ: [
    { key: 'ven_cnpj_contrato_assinado', label: 'Contrato Assinado' },
    { key: 'ven_cnpj_fatura_energia', label: 'fatura de energia do local de instalação' },
    { key: 'ven_cnpj_link_localizacao', label: 'anexar link de localização' },
    { key: 'ven_cnpj_foto_padrao_disjuntor', label: 'foto do padrão de entrada e disjuntor' },
    { key: 'ven_cnpj_cartao_cnpj', label: 'cartão CNPJ' },
    { key: 'ven_cnpj_contrato_social', label: 'contrato social de abertura' },
  ],
};

const getNormalizedInstallationType = (installationType?: InstallationType | null): InstallationType => {
  if (installationType === 'URBANO' || installationType === 'RURAL' || installationType === 'CNPJ') {
    return installationType;
  }
  return 'URBANO';
};

const getTemplateVendasChecklists = (template?: ProjectChecklistTemplate | null) => {
  const templateStage = template?.stages?.VENDAS?.checklistByInstallationType;
  return {
    URBANO: templateStage?.URBANO ?? DEFAULT_VENDAS_CHECKLISTS.URBANO,
    RURAL: templateStage?.RURAL ?? DEFAULT_VENDAS_CHECKLISTS.RURAL,
    CNPJ: templateStage?.CNPJ ?? DEFAULT_VENDAS_CHECKLISTS.CNPJ,
  };
};

export const DEFAULT_PROJECT_STAGES: StageConfig[] = [
  {
    key: 'VENDAS',
    label: 'VENDAS',
    icon: 'Handshake',
    color: 'bg-amber-500 text-white',
    objective: 'Consolidar o fechamento do contrato e alinhar expectativas com o cliente.',
    checklist: [],
    statusOptions: [
      { value: 'fechada', label: 'Fechada' },
      { value: 'em_negociacao', label: 'Em negociação' },
      { value: 'pendente', label: 'Pendente' },
    ],
  },
  {
    key: 'FINANCEIRO',
    label: 'FINANCEIRO',
    icon: 'DollarSign',
    color: 'bg-emerald-600 text-white',
    objective: 'Análise financeira, aprovação de crédito e condições de pagamento.',
    checklist: [
      { key: 'fin_analise_credito', label: 'Análise de crédito realizada' },
      { key: 'fin_documentos_banco', label: 'Documentos enviados ao banco' },
      { key: 'fin_aprovacao_credito', label: 'Crédito aprovado' },
      { key: 'fin_contrato_assinado', label: 'Contrato financeiro assinado' },
      { key: 'fin_recursos_liberados', label: 'Recursos liberados' },
    ],
    statusOptions: [
      { value: 'aprovado', label: 'Aprovado' },
      { value: 'em_analise', label: 'Em análise' },
      { value: 'pendente', label: 'Pendente' },
      { value: 'reprovado', label: 'Reprovado' },
    ],
  },
  {
    key: 'COMPRAS',
    label: 'COMPRAS',
    icon: 'ShoppingCart',
    color: 'bg-sky-500 text-white',
    objective: 'Garantir a aquisição e disponibilidade de materiais para execução.',
    checklist: [
      { key: 'com_lista_materiais', label: 'Lista de materiais validada' },
      { key: 'com_pedidos_enviados', label: 'Pedidos enviados aos fornecedores' },
      { key: 'com_prazo_confirmado', label: 'Prazo de entrega confirmado' },
      { key: 'com_materiais_recebidos', label: 'Materials recebidos e conferidos' },
    ],
    statusOptions: [
      { value: 'comprado', label: 'Comprado' },
      { value: 'em_cotacao', label: 'Em cotação' },
      { value: 'pendente', label: 'Pendente' },
    ],
  },
  {
    key: 'ENGENHEIRO',
    label: 'ENGENHEIRO',
    icon: 'DraftingCompass',
    color: 'bg-indigo-600 text-white',
    objective: 'Planejar tecnicamente o projeto e garantir aprovação junto à concessionária.',
    checklist: [
      { key: 'eng_projeto_elaborado', label: 'Projeto elétrico elaborado' },
      { key: 'eng_memorial_anexado', label: 'Memorial descritivo anexado' },
      { key: 'eng_diagrama_unifilar', label: 'Diagrama unifilar entregue' },
      { key: 'eng_pedido_acesso', label: 'Pedido de acesso enviado' },
      { key: 'eng_aprovacao_concessionaria', label: 'Aprovação da concessionária' },
    ],
    statusOptions: [
      { value: 'aprovado', label: 'Aprovado' },
      { value: 'em_execucao', label: 'Em execução' },
      { value: 'pendente', label: 'Pendente' },
    ],
  },
  {
    key: 'TECNICO',
    label: 'TECNICO',
    icon: 'Wrench',
    color: 'bg-orange-500 text-white',
    objective: 'Executar a instalação e garantir comissionamento do sistema.',
    checklist: [
      { key: 'tec_estrutura_instalada', label: 'Estrutura instalada' },
      { key: 'tec_modulos_instalados', label: 'Módulos e inversores instalados' },
      { key: 'tec_cabeamento_concluido', label: 'Cabeamento e proteções concluídos' },
      { key: 'tec_comissionamento', label: 'Comissionamento realizado' },
      { key: 'tec_monitoramento_ativo', label: 'Monitoramento ativado' },
    ],
    statusOptions: [
      { value: 'concluida', label: 'Concluída' },
      { value: 'em_andamento', label: 'Em andamento' },
      { value: 'pendente', label: 'Pendente' },
    ],
  },
  {
    key: 'POS_VENDA',
    label: 'PÓS VENDA',
    icon: 'HeartHandshake',
    color: 'bg-rose-500 text-white',
    objective: 'Acompanhar o cliente e garantir satisfação.',
    checklist: [
      { key: 'pos_contato_inicial', label: 'Contato pós-instalação realizado' },
      { key: 'pos_verificacao_fatura', label: 'Verificação de geração na primeira fatura' },
      { key: 'pos_orientacao_suporte', label: 'Suporte técnico orientado' },
      { key: 'pos_feedback_registrado', label: 'Feedback do cliente registrado' },
    ],
    statusOptions: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'finalizado', label: 'Finalizado' },
    ],
  },
];

export const DEFAULT_PROJECT_CHECKLIST_TEMPLATE: ProjectChecklistTemplate = {
  stages: {
    VENDAS: {
      checklistByInstallationType: DEFAULT_VENDAS_CHECKLISTS,
    },
    FINANCEIRO: {
      checklist: DEFAULT_PROJECT_STAGES.find((stage) => stage.key === 'FINANCEIRO')?.checklist ?? [],
    },
    COMPRAS: {
      checklist: DEFAULT_PROJECT_STAGES.find((stage) => stage.key === 'COMPRAS')?.checklist ?? [],
    },
    ENGENHEIRO: {
      checklist: DEFAULT_PROJECT_STAGES.find((stage) => stage.key === 'ENGENHEIRO')?.checklist ?? [],
    },
    TECNICO: {
      checklist: DEFAULT_PROJECT_STAGES.find((stage) => stage.key === 'TECNICO')?.checklist ?? [],
    },
    POS_VENDA: {
      checklist: DEFAULT_PROJECT_STAGES.find((stage) => stage.key === 'POS_VENDA')?.checklist ?? [],
    },
  },
};

export const resolveChecklistTemplate = (
  template?: ProjectChecklistTemplate | null,
): ProjectChecklistTemplate => {
  const vendasTemplate = template?.stages?.VENDAS;
  return {
    stages: {
      ...DEFAULT_PROJECT_CHECKLIST_TEMPLATE.stages,
      ...template?.stages,
      VENDAS: {
        ...DEFAULT_PROJECT_CHECKLIST_TEMPLATE.stages.VENDAS,
        ...vendasTemplate,
        checklistByInstallationType: {
          ...DEFAULT_PROJECT_CHECKLIST_TEMPLATE.stages.VENDAS?.checklistByInstallationType,
          ...vendasTemplate?.checklistByInstallationType,
        },
      },
    },
  };
};

export const buildProjectStagesFromTemplate = (
  template?: ProjectChecklistTemplate | null,
): StageConfig[] => {
  const resolvedTemplate = resolveChecklistTemplate(template);
  return DEFAULT_PROJECT_STAGES.map((stage) => {
    if (stage.key === 'VENDAS') {
      return stage;
    }

    const templateStage = resolvedTemplate.stages[stage.key as ProjectStatus];
    return {
      ...stage,
      checklist: templateStage?.checklist ?? stage.checklist,
    };
  });
};

export const getVendasChecklist = (
  installationType?: InstallationType | null,
  template?: ProjectChecklistTemplate | null,
) => {
  const checklists = getTemplateVendasChecklists(template);
  return checklists[getNormalizedInstallationType(installationType)];
};

export const getStageChecklist = (
  stageKey: string,
  installationType?: InstallationType | null,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
  template?: ProjectChecklistTemplate | null,
) => {
  if (stageKey === 'VENDAS') {
    return getVendasChecklist(installationType, template);
  }

  const stage = stages.find((item) => item.key === stageKey);
  return stage?.checklist || [];
};

const getChecklistTemplate = (
  installationType?: InstallationType | null,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
  template?: ProjectChecklistTemplate | null,
) => {
  return stages.flatMap((stage) =>
    stage.key === 'VENDAS' ? getVendasChecklist(installationType, template) : stage.checklist,
  );
};

export const syncChecklistWithTemplate = (
  checklist: Record<string, boolean>,
  installationType?: InstallationType | null,
  template?: ProjectChecklistTemplate | null,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
) => {
  const templateItems = getChecklistTemplate(installationType, stages, template);

  return Object.fromEntries(
    templateItems.map((item) => [item.key, checklist[item.key] ?? false]),
  );
};

export const pruneChecklistForInstallationType = (
  checklist: Record<string, boolean>,
  installationType?: InstallationType | null,
  template?: ProjectChecklistTemplate | null,
) => {
  const vendasChecklists = getTemplateVendasChecklists(template);
  const currentKeys = new Set(getVendasChecklist(installationType, template).map((item) => item.key));
  const allVendasKeys = new Set(
    Object.values(vendasChecklists).flatMap((items) => items.map((item) => item.key)),
  );

  return Object.fromEntries(
    Object.entries(checklist).filter(([key]) => {
      if (!allVendasKeys.has(key)) return true;
      return currentKeys.has(key);
    }),
  );
};

export const getStageByKey = (
  key: string,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
): StageConfig | undefined => {
  return stages.find((stage) => stage.key === key);
};

export const getStageIndex = (
  key: string,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
): number => {
  return stages.findIndex((stage) => stage.key === key);
};

export const calculateProjectProgress = (
  checklist: Record<string, boolean>,
  installationType?: InstallationType | null,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
  template?: ProjectChecklistTemplate | null,
): number => {
  const allChecklistItems = getChecklistTemplate(installationType, stages, template);
  const totalItems = allChecklistItems.length;
  if (totalItems === 0) return 0;

  const completedItems = allChecklistItems.filter((item) => (checklist || {})[item.key]).length;
  return Math.round((completedItems / totalItems) * 100);
};

export const getStageProgress = (
  stageKey: string,
  checklist: Record<string, boolean>,
  installationType?: InstallationType | null,
  stages: StageConfig[] = DEFAULT_PROJECT_STAGES,
  template?: ProjectChecklistTemplate | null,
): number => {
  const stageChecklist = getStageChecklist(stageKey, installationType, stages, template);
  if (stageChecklist.length === 0) return 0;

  const completedItems = stageChecklist.filter((item) => checklist[item.key]).length;
  return Math.round((completedItems / stageChecklist.length) * 100);
};

export const buildInitialChecklist = (installationType?: InstallationType | null): Record<string, boolean> => {
  const initialChecklist: Record<string, boolean> = {};

  DEFAULT_PROJECT_STAGES.forEach((stage) => {
    const items = getStageChecklist(stage.key, installationType);
    items.forEach((item) => {
      initialChecklist[item.key] = false;
    });
  });

  return initialChecklist;
};
