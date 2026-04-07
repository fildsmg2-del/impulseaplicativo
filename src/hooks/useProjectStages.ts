import { useEffect, useMemo, useState } from 'react';
import {
  buildProjectStagesFromTemplate,
  ProjectChecklistTemplate,
} from '@/components/projects/projectStagesConfig';
import { projectChecklistTemplateService } from '@/services/projectChecklistTemplateService';

export const useProjectStages = () => {
  const [template, setTemplate] = useState<ProjectChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await projectChecklistTemplateService.getTemplate();
      setTemplate(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplate();
  }, []);

  const stages = useMemo(() => buildProjectStagesFromTemplate(template), [template]);

  return {
    stages,
    template,
    loading,
    refresh: loadTemplate,
  };
};
