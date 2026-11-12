/**
 * Shared Navigation & Tracking Engine (Single Source of Truth)
 * Used directly by TypeScript services (NavigationService) and bundled into
 * SCORM packages as navigation_engine.js.
 *
 * Strictly written in self-contained ES5/ES6-compatible JS without external imports
 * so initNavigationEngine.toString() executes identically in any browser LMS or Node.
 */
export function initNavigationEngine() {
  var DEFAULT_LESSON_NAV_CONFIG = {
    mode: 'sequential',
    allowBack: true,
    allowSkip: false,
    showPageIndex: true,
    requireCompletionToAdvance: false
  };

  var DEFAULT_PAGE_NAV_RULE = {
    type: 'button'
  };

  function createEmptyPageRuntime() {
    return {
      visited: false,
      completed: false,
      scrollPercent: 0,
      scrolledToBottom: false,
      interactedIds: [],
      openedResourceIds: [],
      confirmedResourceIds: [],
      questionAttempts: {},
      questionAnswers: {},
      questionCorrect: {}
    };
  }

  function getPageInteractiveTargets(page) {
    var targets = [];
    var blocks = (page && Array.isArray(page.blocks)) ? page.blocks : [];
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (!block) continue;
      if (block.type === 'flashcards') {
        var cards = Array.isArray(block.cards) ? block.cards : [];
        targets.push({
          blockId: block.id,
          blockTitle: block.title || 'Tarjetas Flashcards',
          blockType: 'flashcards',
          items: cards.map(function (c, idx) {
            return { id: c.id, label: c.front || ('Tarjeta ' + (idx + 1)) };
          })
        });
      } else if (block.type === 'accordion') {
        var accItems = Array.isArray(block.items) ? block.items : [];
        targets.push({
          blockId: block.id,
          blockTitle: block.title || 'Acordeón Desplegable',
          blockType: 'accordion',
          items: accItems.map(function (it, idx) {
            return { id: it.id, label: it.title || ('Elemento ' + (idx + 1)) };
          })
        });
      } else if (block.type === 'tabs') {
        var tabs = Array.isArray(block.tabs) ? block.tabs : [];
        targets.push({
          blockId: block.id,
          blockTitle: block.title || 'Pestañas Interactivas',
          blockType: 'tabs',
          items: tabs.map(function (t, idx) {
            return { id: t.id, label: t.label || ('Pestaña ' + (idx + 1)) };
          })
        });
      }
    }
    return targets;
  }

  function getPageResourceBlocks(page) {
    var blocks = (page && Array.isArray(page.blocks)) ? page.blocks : [];
    return blocks.filter(function (b) { return b && b.type === 'resource'; });
  }

  function getPageCheckpointQuestionIds(page) {
    var blocks = (page && Array.isArray(page.blocks)) ? page.blocks : [];
    return blocks
      .filter(function (b) { return b && b.type === 'checkpoint' && b.questionId; })
      .map(function (b) { return b.questionId; });
  }

  function isQuestionAutoGradable(q) {
    if (!q || !q.type || q.pendingAdaptation) return false;
    return (
      q.type === 'multiple_choice' ||
      q.type === 'multiple_response' ||
      q.type === 'true_false' ||
      q.type === 'fill_blank' ||
      q.type === 'matching' ||
      q.type === 'numerical'
    );
  }

  function isQuestionValid(q) {
    if (!q || !q.type || !String(q.prompt || '').trim()) return false;
    if (!isQuestionAutoGradable(q)) return false;
    if (q.type === 'multiple_choice' || q.type === 'multiple_response') {
      var opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length === 0) return false;
      var hasCorrect = opts.some(function (o) { return !!o.isCorrect; });
      var allText = opts.every(function (o) { return String(o.text || '').trim().length > 0; });
      return hasCorrect && allText;
    }
    if (q.type === 'true_false') {
      return typeof q.trueFalseAnswer === 'boolean';
    }
    if (q.type === 'fill_blank') {
      var hasBlank = String(q.blankAnswer || '').trim().length > 0;
      var hasVariants = Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.some(function (a) {
        return a && a.fraction > 0 && String(a.text || '').trim().length > 0;
      });
      return hasBlank || hasVariants;
    }
    if (q.type === 'numerical') {
      var nums = Array.isArray(q.numericalAnswers) ? q.numericalAnswers : [];
      return nums.some(function (n) {
        return n && typeof n.value === 'number' && !isNaN(n.value) && (n.fraction === undefined || n.fraction > 0);
      });
    }
    if (q.type === 'matching') {
      var pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
      if (pairs.length === 0) return false;
      return pairs.every(function (p) {
        return String(p.left || '').trim().length > 0 && String(p.right || '').trim().length > 0;
      });
    }
    return false;
  }

  function hasValidAnswer(q, answer) {
    if (!q) return false;
    if (q.type === 'multiple_choice') {
      return typeof answer === 'string' && answer.trim().length > 0;
    }
    if (q.type === 'multiple_response') {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (q.type === 'true_false') {
      return answer === 'true' || answer === 'false';
    }
    if (q.type === 'fill_blank') {
      return typeof answer === 'string' && answer.trim().length > 0;
    }
    if (q.type === 'numerical') {
      if (answer === null || answer === undefined) return false;
      var s = String(answer).trim().replace(',', '.');
      if (!s) return false;
      var n = Number(s);
      return !isNaN(n) && isFinite(n);
    }
    if (q.type === 'matching') {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      var pairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
      if (pairs.length === 0) return false;
      return pairs.every(function (p) {
        return typeof answer[p.id] === 'string' && answer[p.id].trim().length > 0;
      });
    }
    return false;
  }

  function evaluateQuestionAnswer(q, answer) {
    if (!isQuestionValid(q) || !hasValidAnswer(q, answer)) return false;

    if (q.type === 'multiple_choice') {
      var opts = q.options || [];
      var chosen = null;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].id === answer) {
          chosen = opts[i];
          break;
        }
      }
      return !!(chosen && chosen.isCorrect);
    }

    if (q.type === 'multiple_response') {
      var correctIds = (q.options || [])
        .filter(function (o) { return !!o.isCorrect; })
        .map(function (o) { return o.id; });
      var uniqueSelected = [];
      for (var j = 0; j < answer.length; j++) {
        if (uniqueSelected.indexOf(answer[j]) === -1) {
          uniqueSelected.push(answer[j]);
        }
      }
      if (uniqueSelected.length !== correctIds.length) return false;
      for (var k = 0; k < correctIds.length; k++) {
        if (uniqueSelected.indexOf(correctIds[k]) === -1) return false;
      }
      return true;
    }

    if (q.type === 'true_false') {
      var expected = q.trueFalseAnswer ? 'true' : 'false';
      return answer === expected;
    }

    if (q.type === 'fill_blank') {
      var rawInput = String(answer || '').trim();
      var cmpInput = q.caseSensitive ? rawInput : rawInput.toLowerCase();
      if (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0) {
        for (var ai = 0; ai < q.acceptedAnswers.length; ai++) {
          var acc = q.acceptedAnswers[ai];
          if (!acc || acc.fraction <= 0) continue;
          var accText = String(acc.text || '').trim();
          var cmpAcc = q.caseSensitive ? accText : accText.toLowerCase();
          if (cmpInput === cmpAcc) return true;
        }
      }
      var primaryText = String(q.blankAnswer || '').trim();
      var cmpPrimary = q.caseSensitive ? primaryText : primaryText.toLowerCase();
      return !!cmpPrimary && cmpInput === cmpPrimary;
    }

    if (q.type === 'numerical') {
      var numVal = Number(String(answer).trim().replace(',', '.'));
      if (isNaN(numVal) || !isFinite(numVal)) return false;
      var numAns = Array.isArray(q.numericalAnswers) ? q.numericalAnswers : [];
      for (var ni = 0; ni < numAns.length; ni++) {
        var entry = numAns[ni];
        if (!entry || (entry.fraction !== undefined && entry.fraction <= 0)) continue;
        var tol = Math.abs(Number(entry.tolerance || 0));
        if (Math.abs(numVal - Number(entry.value)) <= tol + 1e-9) {
          return true;
        }
      }
      return false;
    }

    if (q.type === 'matching') {
      var pairs = q.matchingPairs || [];
      for (var m = 0; m < pairs.length; m++) {
        var pair = pairs[m];
        var selectedRight = String(answer[pair.id] || '').trim().toLowerCase();
        var expectedRight = String(pair.right || '').trim().toLowerCase();
        if (!selectedRight || selectedRight !== expectedRight) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  function evaluateSingleRule(rule, page, runtime, project) {
    var safeRule = rule || DEFAULT_PAGE_NAV_RULE;
    var rt = runtime || createEmptyPageRuntime();
    var ruleType = safeRule.type;

    if (ruleType === 'button') {
      return {
        met: true,
        label: 'Botón Siguiente',
        instruction: 'Presiona Siguiente para continuar.',
        completedMessage: 'Listo para avanzar a la siguiente sección.',
        progressPercent: 100
      };
    }

    if (ruleType === 'scrolling') {
      var pct = Math.min(100, Math.max(0, Math.round(rt.scrollPercent || 0)));
      var scrollMet = !!rt.scrolledToBottom;
      return {
        met: scrollMet,
        label: 'Lectura completa (Scrolling)',
        instruction: 'Desplázate hasta el final del contenido para continuar.',
        completedMessage: 'Has recorrido todo el contenido de esta sección. Ya puedes continuar.',
        progressText: pct + '% leído',
        progressPercent: pct
      };
    }

    if (ruleType === 'question') {
      var pageCheckpointIds = getPageCheckpointQuestionIds(page);
      var qId = safeRule.questionId || pageCheckpointIds[0] || '';
      var bank = (project && Array.isArray(project.questionBank)) ? project.questionBank : [];
      var question = null;
      for (var i = 0; i < bank.length; i++) {
        if (bank[i].id === qId) {
          question = bank[i];
          break;
        }
      }

      if (!qId) {
        return {
          met: false,
          label: 'Pregunta requerida',
          instruction: 'Esta sección requiere una pregunta de comprobación, pero no tiene ninguna asignada.',
          completedMessage: '',
          progressText: 'Error de configuración',
          configError: 'No hay ninguna pregunta seleccionada en la regla ni un bloque de comprobación en esta página.'
        };
      }

      if (!question) {
        return {
          met: false,
          label: 'Pregunta requerida',
          instruction: 'La pregunta configurada para desbloquear esta sección no se encuentra en el banco.',
          completedMessage: '',
          progressText: 'Error de configuración',
          configError: 'La pregunta vinculada ("' + qId + '") ya no existe en el banco de preguntas.'
        };
      }

      if (!isQuestionValid(question)) {
        return {
          met: false,
          label: 'Pregunta requerida',
          instruction: 'La pregunta vinculada tiene una configuración incompleta (sin respuesta correcta válida).',
          completedMessage: '',
          progressText: 'Error de configuración',
          configError: 'La pregunta "' + (question.prompt || qId) + '" no tiene opciones o respuesta correcta válida configurada.'
        };
      }

      var criteria = safeRule.questionCriteria || 'correct';
      var attempts = (rt.questionAttempts && rt.questionAttempts[qId]) || 0;
      var ans = rt.questionAnswers ? rt.questionAnswers[qId] : undefined;
      var hasAnswered = hasValidAnswer(question, ans);
      var isCorrect = !!(rt.questionCorrect && rt.questionCorrect[qId]) || (hasAnswered && evaluateQuestionAnswer(question, ans));
      var maxAttempts = safeRule.maxAttempts || 0;

      if (criteria === 'answered') {
        return {
          met: hasAnswered,
          label: 'Responder pregunta',
          instruction: 'Responde la pregunta de comprobación para desbloquear la siguiente sección.',
          completedMessage: 'Respuesta registrada. Puedes continuar a la siguiente sección.',
          progressText: hasAnswered ? 'Respondida' : 'Pendiente de responder'
        };
      }

      var attemptsText = maxAttempts > 0 ? (' (Intento ' + attempts + '/' + maxAttempts + ')') : '';
      return {
        met: isCorrect,
        label: 'Responder correctamente',
        instruction: 'Responde correctamente la pregunta para desbloquear la siguiente sección.' + attemptsText,
        completedMessage: '¡Respuesta correcta! Sección desbloqueada para continuar.',
        progressText: isCorrect ? 'Correcta' : (hasAnswered ? 'Incorrecta — intenta nuevamente' : 'Pendiente')
      };
    }

    if (ruleType === 'interaction') {
      var targets = getPageInteractiveTargets(page);
      var hasExplicitTarget = !!(safeRule.targetBlockId && safeRule.targetBlockId !== 'any');
      var targetBlock = null;
      if (hasExplicitTarget) {
        for (var tIdx = 0; tIdx < targets.length; tIdx++) {
          if (targets[tIdx].blockId === safeRule.targetBlockId) {
            targetBlock = targets[tIdx];
            break;
          }
        }
        if (!targetBlock) {
          return {
            met: false,
            label: 'Interacción requerida',
            instruction: 'El bloque interactivo requerido por esta sección ya no existe en la página.',
            completedMessage: '',
            progressText: 'Error de configuración',
            configError: 'El bloque interactivo asignado ("' + safeRule.targetBlockId + '") no se encuentra en esta página.'
          };
        }
      }

      var candidateItems = targetBlock
        ? targetBlock.items
        : targets.reduce(function (acc, t) { return acc.concat(t.items); }, []);

      if (candidateItems.length === 0) {
        return {
          met: false,
          label: 'Interacción requerida',
          instruction: 'Esta sección exige interactuar con un bloque de tarjetas, acordeón o pestañas, pero no hay ninguno configurado.',
          completedMessage: '',
          progressText: 'Error de configuración',
          configError: 'Agrega al menos un bloque interactivo (Flashcards, Acordeón o Pestañas) con elementos en esta página.'
        };
      }

      var interactedList = Array.isArray(rt.interactedIds) ? rt.interactedIds : [];
      var interactedMap = {};
      for (var ii = 0; ii < interactedList.length; ii++) {
        interactedMap[interactedList[ii]] = true;
      }

      var iCriteria = safeRule.interactionCriteria || 'all_items';

      if (iCriteria === 'any_one') {
        var validOne = candidateItems.filter(function (it) { return !!interactedMap[it.id]; }).length;
        return {
          met: validOne >= 1,
          label: 'Interacción con elemento',
          instruction: 'Explora o voltea al menos un elemento interactivo para continuar.',
          completedMessage: 'Interacción completada. Ya puedes avanzar.',
          progressText: Math.min(validOne, 1) + ' de 1 requerido',
          progressPercent: validOne >= 1 ? 100 : 0
        };
      }

      if (iCriteria === 'specific_count') {
        var reqCount = Math.min(candidateItems.length, Math.max(1, safeRule.requiredCount || 1));
        var validN = candidateItems.filter(function (it) { return !!interactedMap[it.id]; }).length;
        var pctN = Math.min(100, Math.round((validN / reqCount) * 100));
        return {
          met: validN >= reqCount,
          label: 'Interacción múltiple',
          instruction: 'Interactúa con al menos ' + reqCount + ' elementos (' + (targetBlock ? targetBlock.blockTitle : 'tarjetas o pestañas') + ') antes de continuar.',
          completedMessage: 'Has explorado los elementos requeridos. Ya puedes continuar.',
          progressText: Math.min(validN, reqCount) + ' de ' + reqCount + ' explorados',
          progressPercent: pctN
        };
      }

      var requiredPool = candidateItems;
      if (Array.isArray(safeRule.requiredItemIds) && safeRule.requiredItemIds.length > 0) {
        requiredPool = candidateItems.filter(function (it) {
          return safeRule.requiredItemIds.indexOf(it.id) !== -1;
        });
        if (requiredPool.length === 0) {
          return {
            met: false,
            label: 'Interacción requerida',
            instruction: 'Los elementos interactivos obligatorios ya no se encuentran en esta página.',
            completedMessage: '',
            progressText: 'Error de configuración',
            configError: 'Los ítems obligatorios seleccionados en la regla de interacción fueron eliminados.'
          };
        }
      }

      var doneCount = requiredPool.filter(function (it) { return !!interactedMap[it.id]; }).length;
      var pctAll = Math.round((doneCount / requiredPool.length) * 100);
      return {
        met: doneCount >= requiredPool.length,
        label: 'Explorar elementos interactivos',
        instruction: 'Voltea o explora todos los elementos requeridos para desbloquear la siguiente sección.',
        completedMessage: 'Todos los elementos han sido explorados. Avance habilitado.',
        progressText: doneCount + ' de ' + requiredPool.length + ' completados',
        progressPercent: pctAll
      };
    }

    if (ruleType === 'resource') {
      var resources = getPageResourceBlocks(page);
      var targetRes = null;
      if (safeRule.resourceBlockId) {
        for (var rIdx = 0; rIdx < resources.length; rIdx++) {
          if (resources[rIdx].id === safeRule.resourceBlockId) {
            targetRes = resources[rIdx];
            break;
          }
        }
        if (!targetRes) {
          return {
            met: false,
            label: 'Revisión de recurso',
            instruction: 'El bloque de recurso requerido por esta sección ya no existe en la página.',
            completedMessage: '',
            progressText: 'Error de configuración',
            configError: 'El recurso descargable asignado ("' + safeRule.resourceBlockId + '") no se encuentra en esta página.'
          };
        }
      } else {
        targetRes = resources[0] || null;
        if (!targetRes) {
          return {
            met: false,
            label: 'Revisión de recurso',
            instruction: 'Esta sección requiere revisar un recurso descargable, pero no hay ninguno configurado.',
            completedMessage: '',
            progressText: 'Error de configuración',
            configError: 'Agrega un bloque de Recurso Descargable en esta página para habilitar esta condición.'
          };
        }
      }

      if (!targetRes.relativePath || !String(targetRes.relativePath).trim()) {
        return {
          met: false,
          label: 'Revisión de recurso',
          instruction: 'El recurso asignado a esta sección aún no tiene un archivo adjunto.',
          completedMessage: '',
          progressText: 'Error de configuración',
          configError: 'Sube o adjunta un archivo en el bloque "' + (targetRes.title || 'Recurso') + '".'
        };
      }

      var rCriteria = safeRule.resourceCriteria || 'confirm_review';
      var opened = Array.isArray(rt.openedResourceIds) && rt.openedResourceIds.indexOf(targetRes.id) !== -1;
      var confirmed = Array.isArray(rt.confirmedResourceIds) && rt.confirmedResourceIds.indexOf(targetRes.id) !== -1;
      var rTitle = targetRes.title || targetRes.filename || 'recurso';

      if (rCriteria === 'open_only') {
        return {
          met: opened,
          label: 'Abrir recurso',
          instruction: 'Abre o descarga el archivo "' + rTitle + '" para continuar.',
          completedMessage: 'Recurso abierto. Ya puedes continuar a la siguiente sección.',
          progressText: opened ? 'Archivo abierto' : 'Pendiente de abrir'
        };
      }

      if (rCriteria === 'confirm_activity') {
        var actMet = opened && confirmed;
        return {
          met: actMet,
          label: 'Completar actividad del recurso',
          instruction: 'Abre el recurso "' + rTitle + '" y confirma que realizaste la actividad relacionada para continuar.',
          completedMessage: 'Actividad confirmada. Ya puedes continuar.',
          progressText: actMet ? 'Confirmado' : (opened ? 'Archivo abierto · Falta confirmar realización' : 'Pendiente de abrir y confirmar')
        };
      }

      var revMet = opened && confirmed;
      return {
        met: revMet,
        label: 'Revisar y confirmar recurso',
        instruction: 'Abre el recurso "' + rTitle + '" y confirma su revisión para continuar.',
        completedMessage: 'Revisión confirmada por el estudiante. Ya puedes continuar.',
        progressText: revMet ? 'Revisión confirmada' : (opened ? 'Archivo abierto · Falta confirmar revisión' : 'Pendiente de abrir y confirmar')
      };
    }

    // Fail-closed on any unknown rule type
    return {
      met: false,
      label: 'Condición desconocida',
      instruction: 'La condición de navegación configurada ("' + String(ruleType) + '") no es válida.',
      completedMessage: '',
      progressText: 'Error de configuración',
      configError: 'Tipo de condición desconocido: "' + String(ruleType) + '". Selecciona una condición válida.'
    };
  }

  function evaluatePageCondition(page, runtimeInput, project) {
    var rule = (page && page.navigationRule) ? page.navigationRule : DEFAULT_PAGE_NAV_RULE;
    var runtime = runtimeInput || createEmptyPageRuntime();
    var primaryResult = evaluateSingleRule(rule, page, runtime, project);

    if (rule.combinator && Array.isArray(rule.secondaryRules) && rule.secondaryRules.length > 0) {
      var secondaryResults = rule.secondaryRules.map(function (sr) {
        return evaluateSingleRule(sr, page, runtime, project);
      });
      var firstConfigError = primaryResult.configError || '';
      if (!firstConfigError) {
        for (var i = 0; i < secondaryResults.length; i++) {
          if (secondaryResults[i].configError) {
            firstConfigError = secondaryResults[i].configError;
            break;
          }
        }
      }

      if (rule.combinator === 'AND') {
        var allMet = primaryResult.met && secondaryResults.every(function (r) { return r.met; });
        return {
          met: allMet,
          label: primaryResult.label,
          instruction: primaryResult.instruction,
          completedMessage: primaryResult.completedMessage,
          progressText: primaryResult.progressText,
          progressPercent: primaryResult.progressPercent,
          configError: firstConfigError || undefined
        };
      } else {
        var anyMet = primaryResult.met || secondaryResults.some(function (r) { return r.met; });
        return {
          met: anyMet,
          label: primaryResult.label,
          instruction: primaryResult.instruction,
          completedMessage: primaryResult.completedMessage,
          progressText: primaryResult.progressText,
          progressPercent: primaryResult.progressPercent,
          configError: anyMet ? undefined : (firstConfigError || undefined)
        };
      }
    }

    return primaryResult;
  }

  function canJumpToPage(lesson, targetIndex, currentIndex, pagesRuntime) {
    var config = (lesson && lesson.navigationConfig) ? lesson.navigationConfig : DEFAULT_LESSON_NAV_CONFIG;
    var pages = (lesson && Array.isArray(lesson.pages)) ? lesson.pages : [];

    if (targetIndex < 0 || targetIndex >= pages.length) {
      return { allowed: false, reason: 'Página fuera de rango.' };
    }
    if (targetIndex === currentIndex) {
      return { allowed: true };
    }
    if (config.mode === 'free') {
      return { allowed: true };
    }
    if (targetIndex < currentIndex) {
      if (config.allowBack === false) {
        return { allowed: false, reason: 'Esta lección no permite retroceder a páginas anteriores.' };
      }
      return { allowed: true };
    }
    if (config.allowSkip) {
      return { allowed: true };
    }
    for (var i = 0; i < targetIndex; i++) {
      var p = pages[i];
      var rt = pagesRuntime ? pagesRuntime[p.id] : null;
      if (!rt || !rt.completed) {
        return {
          allowed: false,
          reason: 'Completa "' + p.title + '" antes de avanzar a esta sección.'
        };
      }
    }
    return { allowed: true };
  }

  function isLessonReadyForCompletion(lesson, pagesRuntime, project) {
    var pendingPageTitles = [];
    var pages = (lesson && Array.isArray(lesson.pages)) ? lesson.pages : [];
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var rt = pagesRuntime ? pagesRuntime[p.id] : undefined;
      var evalRes = evaluatePageCondition(p, rt, project);
      if (!evalRes.met) {
        pendingPageTitles.push(p.title);
      }
    }
    return {
      ready: pendingPageTitles.length === 0,
      pendingPageTitles: pendingPageTitles
    };
  }

  function utf8ByteLength(str) {
    if (!str) return 0;
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).length;
    }
    try {
      return unescape(encodeURIComponent(str)).length;
    } catch (e) {
      return str.length * 2;
    }
  }

  function buildPageMaps(project) {
    var pageIndexMap = {};
    var reversePageMap = {};
    var pCounter = 0;
    var firstLessonId = '';
    var firstPageId = '';

    var units = (project && Array.isArray(project.units)) ? project.units : [];
    for (var u = 0; u < units.length; u++) {
      var lessons = Array.isArray(units[u].lessons) ? units[u].lessons : [];
      for (var l = 0; l < lessons.length; l++) {
        var les = lessons[l];
        if (!firstLessonId) firstLessonId = les.id;
        var pages = Array.isArray(les.pages) ? les.pages : [];
        for (var p = 0; p < pages.length; p++) {
          var pg = pages[p];
          if (!firstPageId) firstPageId = pg.id;
          pageIndexMap[pg.id] = pCounter;
          reversePageMap[pCounter] = pg.id;
          pCounter++;
        }
      }
    }

    return {
      pageIndexMap: pageIndexMap,
      reversePageMap: reversePageMap,
      firstLessonId: firstLessonId,
      firstPageId: firstPageId
    };
  }

  function serializeSuspendData(state, project) {
    var maps = buildPageMaps(project);
    var pageIndexMap = maps.pageIndexMap;
    var compactPages = {};
    var pagesObj = (state && state.pages) ? state.pages : {};

    Object.keys(pagesObj).forEach(function (pageId) {
      var idx = pageIndexMap[pageId];
      if (idx === undefined) return;
      var rt = pagesObj[pageId];
      if (!rt) return;
      var hasInteractions = Array.isArray(rt.interactedIds) && rt.interactedIds.length > 0;
      var hasOpened = Array.isArray(rt.openedResourceIds) && rt.openedResourceIds.length > 0;
      var hasConfirmed = Array.isArray(rt.confirmedResourceIds) && rt.confirmedResourceIds.length > 0;
      var hasAnswers = rt.questionAnswers && Object.keys(rt.questionAnswers).length > 0;
      if (!rt.visited && !rt.completed && !rt.scrolledToBottom && !hasInteractions && !hasOpened && !hasConfirmed && !hasAnswers) {
        return;
      }
      var entry = {};
      if (rt.visited) entry.v = 1;
      if (rt.completed) entry.c = 1;
      if (rt.scrolledToBottom) entry.s = 1;
      if (hasInteractions) entry.i = rt.interactedIds.slice();
      if (hasOpened) entry.o = rt.openedResourceIds.slice();
      if (hasConfirmed) entry.f = rt.confirmedResourceIds.slice();
      if (hasAnswers) entry.a = JSON.parse(JSON.stringify(rt.questionAnswers));
      if (rt.questionCorrect && Object.keys(rt.questionCorrect).length > 0) {
        entry.ok = JSON.parse(JSON.stringify(rt.questionCorrect));
      }
      if (rt.questionAttempts && Object.keys(rt.questionAttempts).length > 0) {
        entry.at = JSON.parse(JSON.stringify(rt.questionAttempts));
      }
      compactPages[String(idx)] = entry;
    });

    var completedLessons = [];
    if (state && state.completedLessons) {
      Object.keys(state.completedLessons).forEach(function (k) {
        if (state.completedLessons[k]) completedLessons.push(k);
      });
    }

    var payload = {
      v: 2,
      cl: (state && state.currentLessonId) || '',
      cp: (state && state.currentPageId) || '',
      ls: completedLessons,
      as: (state && state.completedAssessments) ? JSON.parse(JSON.stringify(state.completedAssessments)) : {},
      pg: compactPages
    };

    var json = JSON.stringify(payload);
    if (utf8ByteLength(json) <= 4096) {
      return json;
    }

    // Pass 1: Trim interaction IDs & attempt counters on already-completed pages
    Object.keys(payload.pg).forEach(function (k) {
      if (payload.pg[k].c) {
        delete payload.pg[k].i;
        delete payload.pg[k].at;
      }
    });
    json = JSON.stringify(payload);
    if (utf8ByteLength(json) <= 4096) {
      return json;
    }

    // Pass 2: Trim verbose answers/resources on completed pages while keeping completion flags
    Object.keys(payload.pg).forEach(function (k) {
      if (payload.pg[k].c) {
        delete payload.pg[k].a;
        delete payload.pg[k].ok;
        delete payload.pg[k].o;
        delete payload.pg[k].f;
      }
    });
    json = JSON.stringify(payload);
    if (utf8ByteLength(json) <= 4096) {
      return json;
    }

    // Pass 3: Trim long answer values on incomplete pages and interaction arrays
    Object.keys(payload.pg).forEach(function (k) {
      var pgEntry = payload.pg[k];
      if (pgEntry.a && typeof pgEntry.a === 'object') {
        Object.keys(pgEntry.a).forEach(function (qKey) {
          var val = pgEntry.a[qKey];
          if (typeof val === 'string' && val.length > 60) {
            pgEntry.a[qKey] = val.slice(0, 60);
          }
        });
      }
      if (Array.isArray(pgEntry.i) && pgEntry.i.length > 20) {
        pgEntry.i = pgEntry.i.slice(0, 20);
      }
    });
    json = JSON.stringify(payload);
    if (utf8ByteLength(json) <= 4096) {
      return json;
    }

    // Pass 4: Strip detail maps from incomplete pages, keeping flags + current page state
    var curPageIdx = pageIndexMap[payload.cp];
    Object.keys(payload.pg).forEach(function (k) {
      if (curPageIdx !== undefined && String(curPageIdx) === k) return;
      delete payload.pg[k].a;
      delete payload.pg[k].i;
      delete payload.pg[k].o;
      delete payload.pg[k].f;
      delete payload.pg[k].at;
    });
    json = JSON.stringify(payload);
    if (utf8ByteLength(json) <= 4096) {
      return json;
    }

    // Pass 5: Drop non-completed page entries oldest-first while always preserving valid JSON
    var pgKeys = Object.keys(payload.pg).sort(function (a, b) { return Number(a) - Number(b); });
    for (var pk = 0; pk < pgKeys.length && utf8ByteLength(json) > 4096; pk++) {
      var key = pgKeys[pk];
      if (!payload.pg[key].c && String(curPageIdx) !== key) {
        delete payload.pg[key];
        json = JSON.stringify(payload);
      }
    }
    for (var pk2 = 0; pk2 < pgKeys.length && utf8ByteLength(json) > 4096; pk2++) {
      var key2 = pgKeys[pk2];
      if (String(curPageIdx) !== key2) {
        delete payload.pg[key2];
        json = JSON.stringify(payload);
      }
    }
    if (utf8ByteLength(json) > 4096) {
      payload.pg = {};
      json = JSON.stringify(payload);
    }
    if (utf8ByteLength(json) > 4096) {
      json = JSON.stringify({
        v: 2,
        cl: String(payload.cl).slice(0, 64),
        cp: String(payload.cp).slice(0, 64),
        ls: payload.ls,
        as: payload.as,
        pg: {}
      });
    }
    if (utf8ByteLength(json) > 4096) {
      json = JSON.stringify({
        v: 2,
        cl: String(payload.cl).slice(0, 64),
        cp: String(payload.cp).slice(0, 64),
        ls: [],
        as: {},
        pg: {}
      });
    }
    return json;
  }

  function deserializeSuspendData(suspendStr, lessonLocation, project) {
    var maps = buildPageMaps(project);
    var reversePageMap = maps.reversePageMap;

    var state = {
      currentLessonId: maps.firstLessonId,
      currentPageId: maps.firstPageId,
      completedLessons: {},
      completedAssessments: {},
      pages: {}
    };

    if (lessonLocation && typeof lessonLocation === 'string') {
      if (lessonLocation.indexOf('|') !== -1) {
        var parts = lessonLocation.split('|');
        if (parts[0]) state.currentLessonId = parts[0];
        if (parts[1]) state.currentPageId = parts[1];
      } else {
        state.currentLessonId = lessonLocation;
      }
    }

    if (!suspendStr) return state;

    try {
      var parsed = JSON.parse(suspendStr);
      if (parsed && parsed.v === 2) {
        if (parsed.cl) state.currentLessonId = parsed.cl;
        if (parsed.cp) state.currentPageId = parsed.cp;
        if (Array.isArray(parsed.ls)) {
          parsed.ls.forEach(function (lId) {
            state.completedLessons[lId] = true;
          });
        }
        if (parsed.as && typeof parsed.as === 'object') {
          state.completedAssessments = parsed.as;
        }
        if (parsed.pg && typeof parsed.pg === 'object') {
          Object.keys(parsed.pg).forEach(function (idxStr) {
            var pageId = reversePageMap[Number(idxStr)];
            var entry = parsed.pg[idxStr];
            if (!pageId || !entry) return;
            state.pages[pageId] = {
              visited: !!entry.v,
              completed: !!entry.c,
              scrollPercent: entry.s ? 100 : 0,
              scrolledToBottom: !!entry.s,
              interactedIds: Array.isArray(entry.i) ? entry.i : [],
              openedResourceIds: Array.isArray(entry.o) ? entry.o : [],
              confirmedResourceIds: Array.isArray(entry.f) ? entry.f : [],
              questionAnswers: entry.a || {},
              questionCorrect: entry.ok || {},
              questionAttempts: entry.at || {}
            };
          });
        }
      }
    } catch (e) {
      // Ignore malformed suspend_data gracefully
    }

    return state;
  }

  return {
    DEFAULT_LESSON_NAV_CONFIG: DEFAULT_LESSON_NAV_CONFIG,
    DEFAULT_PAGE_NAV_RULE: DEFAULT_PAGE_NAV_RULE,
    createEmptyPageRuntime: createEmptyPageRuntime,
    getPageInteractiveTargets: getPageInteractiveTargets,
    getPageResourceBlocks: getPageResourceBlocks,
    getPageCheckpointQuestionIds: getPageCheckpointQuestionIds,
    isQuestionAutoGradable: isQuestionAutoGradable,
    isQuestionValid: isQuestionValid,
    hasValidAnswer: hasValidAnswer,
    evaluateQuestionAnswer: evaluateQuestionAnswer,
    evaluatePageCondition: evaluatePageCondition,
    canJumpToPage: canJumpToPage,
    isLessonReadyForCompletion: isLessonReadyForCompletion,
    utf8ByteLength: utf8ByteLength,
    serializeSuspendData: serializeSuspendData,
    deserializeSuspendData: deserializeSuspendData
  };
}
