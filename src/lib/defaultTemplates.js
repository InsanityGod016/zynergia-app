/**
 * defaultTemplates.js — Plantillas base de mensajes WhatsApp para Zynergia.
 *
 * Las subcategorías DEBEN coincidir exactamente con los valores de
 * template_subcategory definidos en taskEngine.jsx. SelectMessageTone filtra
 * por: category + subcategory === task.template_subcategory
 *
 * Variables disponibles en el contenido:
 *   {{contact.full_name}}   → nombre del contacto
 *   {{product.name}}        → nombre del producto
 *   {{product.link_URL}}    → link del producto (configurado en EditProduct)
 *
 * Tonos: 'general' | 'amigable' | 'directo'
 * Categorías: 'seguimiento' | 'recompra' | 'reactivacion'
 */

export const DEFAULT_TEMPLATES = [

  // ════════════════════════════════════════════════════════════════════
  // PRODUCTO — Bienvenida día 3 (post primera compra)
  // subcategory: 'producto_dia_3'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Bienvenida Día 3 — General',
    category: 'seguimiento', subcategory: 'producto_dia_3', tone: 'general',
    content: `Hola {{contact.full_name}}, espero que ya estés disfrutando {{product.name}}. ¿Tienes alguna pregunta sobre cómo usarlo? Estoy aquí para ayudarte en lo que necesites.`,
  },
  {
    name: 'Bienvenida Día 3 — Amigable',
    category: 'seguimiento', subcategory: 'producto_dia_3', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 Ya llevas 3 días con {{product.name}}, ¿cómo te ha ido? Cualquier pregunta que tengas, aquí estoy. ¡Espero que estés notando los primeros cambios!`,
  },
  {
    name: 'Bienvenida Día 3 — Directo',
    category: 'seguimiento', subcategory: 'producto_dia_3', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿cómo vas con {{product.name}}? Quiero asegurarme de que estés usándolo correctamente para que obtengas los mejores resultados. ¿Tienes dudas?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // RECOMPRA — 7 días antes
  // subcategory: 'producto_7_dias_antes'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Recompra 7 días antes — General',
    category: 'recompra', subcategory: 'producto_7_dias_antes', tone: 'general',
    content: `Hola {{contact.full_name}}, te escribo para avisarte que en aproximadamente una semana finalizará tu {{product.name}}. Para no quedarte sin él y mantener tus resultados, aquí el enlace: {{product.link_URL}}`,
  },
  {
    name: 'Recompra 7 días antes — Amigable',
    category: 'recompra', subcategory: 'producto_7_dias_antes', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🌟 Quería avisarte que en una semana se te va a acabar tu {{product.name}}. ¡No dejes que se interrumpa tu progreso! Aquí el link para que hagas tu pedido a tiempo: {{product.link_URL}}`,
  },
  {
    name: 'Recompra 7 días antes — Directo',
    category: 'recompra', subcategory: 'producto_7_dias_antes', tone: 'directo',
    content: `Hola {{contact.full_name}}, en 7 días termina tu {{product.name}}. Para asegurar continuidad en tus resultados, realiza tu pedido antes de que se acabe: {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // RECOMPRA — 3 días antes
  // subcategory: 'producto_3_dias_antes'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Recompra 3 días antes — General',
    category: 'recompra', subcategory: 'producto_3_dias_antes', tone: 'general',
    content: `Hola {{contact.full_name}}, te recuerdo que en 3 días terminará tu {{product.name}}. ¿Ya realizaste tu pedido? Aquí el enlace: {{product.link_URL}}`,
  },
  {
    name: 'Recompra 3 días antes — Amigable',
    category: 'recompra', subcategory: 'producto_3_dias_antes', tone: 'amigable',
    content: `Hola {{contact.full_name}}! Ya casi terminas tu {{product.name}} 😊. Si todavía no has hecho el pedido, ¡es el momento! No quieres quedarte sin él: {{product.link_URL}}`,
  },
  {
    name: 'Recompra 3 días antes — Directo',
    category: 'recompra', subcategory: 'producto_3_dias_antes', tone: 'directo',
    content: `Hola {{contact.full_name}}, en 3 días termina tu {{product.name}}. Si aún no has pedido, hazlo ahora para evitar interrupciones: {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // RECOMPRA — 5 días después
  // subcategory: 'producto_5_dias_despues'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Recompra 5 días después — General',
    category: 'recompra', subcategory: 'producto_5_dias_despues', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿pudiste hacer tu pedido de {{product.name}}? Si necesitas ayuda para realizarlo, con gusto te apoyo: {{product.link_URL}}`,
  },
  {
    name: 'Recompra 5 días después — Amigable',
    category: 'recompra', subcategory: 'producto_5_dias_despues', tone: 'amigable',
    content: `Hola {{contact.full_name}}! ¿Cómo vas? Solo quería verificar que hayas podido hacer tu pedido de {{product.name}}. Si no, todavía estás a tiempo 💪: {{product.link_URL}}`,
  },
  {
    name: 'Recompra 5 días después — Directo',
    category: 'recompra', subcategory: 'producto_5_dias_despues', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿ya tienes tu nuevo {{product.name}}? Si aún no, aquí el link: {{product.link_URL}}. La constancia es clave para los resultados.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // REACTIVACIÓN — producto
  // subcategory: 'producto_reactivacion'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Reactivación Producto — General',
    category: 'reactivacion', subcategory: 'producto_reactivacion', tone: 'general',
    content: `Hola {{contact.full_name}}, hace tiempo que no sé de ti. ¿Cómo estás? Quería recordarte que {{product.name}} sigue disponible y que con gusto puedo ayudarte a retomar tu pedido: {{product.link_URL}}`,
  },
  {
    name: 'Reactivación Producto — Amigable',
    category: 'reactivacion', subcategory: 'producto_reactivacion', tone: 'amigable',
    content: `Hola {{contact.full_name}}! ¡Cuánto tiempo! Espero que estés muy bien 😊. Me acordé de ti y quería preguntarte cómo te fue con {{product.name}}. ¿Te gustaría retomarlo? Aquí el link: {{product.link_URL}}`,
  },
  {
    name: 'Reactivación Producto — Directo',
    category: 'reactivacion', subcategory: 'producto_reactivacion', tone: 'directo',
    content: `Hola {{contact.full_name}}, noto que llevas un tiempo sin pedir {{product.name}}. ¿Puedo preguntarte qué pasó? Me gustaría ayudarte a retomar tus resultados: {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — Día 1
  // subcategory: 'prospecto_producto_dia_1'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto Día 1 — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_1', tone: 'general',
    content: `Hola {{contact.full_name}}, un gusto saludarte. Te contacto porque quiero compartirte información sobre {{product.name}}, que podría ser de mucho beneficio para ti. ¿Tienes unos minutos para platicar? {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 1 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_1', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 Qué gusto saludarte. Quería compartirte algo que creo que te va a interesar mucho: {{product.name}}. ¡Creo que puede ayudarte bastante! ¿Platicamos? {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 1 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_1', tone: 'directo',
    content: `Hola {{contact.full_name}}, te contacto porque tengo un producto que puede interesarte: {{product.name}}. ¿Tienes 5 minutos para que te cuente los beneficios? {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — Día 3
  // subcategory: 'prospecto_producto_dia_3'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto Día 3 — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_3', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿tuviste oportunidad de revisar la información sobre {{product.name}} que te compartí? Estoy disponible si tienes alguna pregunta. {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 3 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_3', tone: 'amigable',
    content: `Hola {{contact.full_name}}! ¿Pudiste echarle un ojo a {{product.name}}? 😊 Me encantaría saber qué piensas. Si tienes dudas, con todo gusto te las resuelvo. {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 3 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_3', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿revisaste la info de {{product.name}}? ¿Qué dudas tienes? Me gustaría saber si esto es algo que te interesa para ayudarte a dar el siguiente paso. {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — Día 7
  // subcategory: 'prospecto_producto_dia_7'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto Día 7 — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_7', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿cómo has estado? Quería retomar la conversación sobre {{product.name}}. ¿Tienes alguna pregunta que pueda resolver? {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 7 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_7', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🙌 Espero que estés super bien. Te escribo para ver si tienes más preguntas sobre {{product.name}}. Muchas personas que ya lo usan están teniendo resultados increíbles. ¿Platicamos? {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 7 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_7', tone: 'directo',
    content: `Hola {{contact.full_name}}, llevo una semana intentando compartirte los beneficios de {{product.name}}. ¿Hay algo que te esté impidiendo dar el siguiente paso? Con gusto te ayudo a resolverlo. {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — Día 10
  // subcategory: 'prospecto_producto_dia_10'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto Día 10 — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_10', tone: 'general',
    content: `Hola {{contact.full_name}}, último seguimiento sobre {{product.name}}. Si en algún momento te interesa o tienes preguntas, aquí estaré. {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 10 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_10', tone: 'amigable',
    content: `Hola {{contact.full_name}}! Solo paso a despedirme por ahora sobre {{product.name}} 😊. Cuando estés listo o tengas preguntas, aquí estaré con gusto. ¡Cuídate mucho! {{product.link_URL}}`,
  },
  {
    name: 'Prospecto Producto Día 10 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_dia_10', tone: 'directo',
    content: `Hola {{contact.full_name}}, es mi último mensaje sobre {{product.name}}. Si cambias de opinión o tienes preguntas, avísame. Aquí el enlace por si lo necesitas: {{product.link_URL}}`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — Día 1
  // subcategory: 'prospecto_partner_dia_1'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner Día 1 — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_1', tone: 'general',
    content: `Hola {{contact.full_name}}, quería compartirte una oportunidad de negocio que creo puede interesarte. ¿Tienes unos minutos para platicar sobre cómo construir un ingreso adicional?`,
  },
  {
    name: 'Prospecto Partner Día 1 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_1', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 ¿Cómo estás? Quería contarte algo que creo puede cambiar tu vida. Hay una oportunidad de negocio increíble y pensé en ti inmediatamente. ¿Platicamos?`,
  },
  {
    name: 'Prospecto Partner Día 1 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_1', tone: 'directo',
    content: `Hola {{contact.full_name}}, te contacto porque tengo una oportunidad de negocio y creo que tú tienes el perfil para esto. ¿Tienes 15 minutos esta semana para que te explique?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — Día 3
  // subcategory: 'prospecto_partner_dia_3'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner Día 3 — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_3', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿tuviste oportunidad de pensar en lo que platicamos? Me gustaría resolver cualquier duda que tengas sobre la oportunidad de negocio.`,
  },
  {
    name: 'Prospecto Partner Día 3 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_3', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🙌 ¿Cómo te has sentido con la información que te compartí? Cualquier pregunta que tengas sobre la oportunidad, con gusto te la resuelvo.`,
  },
  {
    name: 'Prospecto Partner Día 3 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_3', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿qué piensas de la oportunidad? Me gustaría saber si tienes dudas o si quieres dar el siguiente paso. ¿Podemos hablar esta semana?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — Día 7
  // subcategory: 'prospecto_partner_dia_7'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner Día 7 — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_7', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿cómo has estado? Quería retomar la conversación sobre la oportunidad de negocio. ¿Tienes alguna pregunta que pueda resolver?`,
  },
  {
    name: 'Prospecto Partner Día 7 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_7', tone: 'amigable',
    content: `Hola {{contact.full_name}}! Espero que todo vaya muy bien 😊. Llevo una semana pensando que esta oportunidad es perfecta para ti. ¿Podemos hablar esta semana?`,
  },
  {
    name: 'Prospecto Partner Día 7 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_7', tone: 'directo',
    content: `Hola {{contact.full_name}}, sé que es difícil tomar una decisión. ¿Qué es lo que te detiene? Cuéntame para ver cómo puedo ayudarte a evaluar si esto es para ti.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — Día 10
  // subcategory: 'prospecto_partner_dia_10'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner Día 10 — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_10', tone: 'general',
    content: `Hola {{contact.full_name}}, es mi último seguimiento sobre la oportunidad de negocio. Si en algún momento cambias de opinión o tienes preguntas, aquí estaré.`,
  },
  {
    name: 'Prospecto Partner Día 10 — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_10', tone: 'amigable',
    content: `Hola {{contact.full_name}}! Solo me despido por ahora 😊. Si en algún momento quieres saber más sobre la oportunidad, aquí estoy con gusto. ¡Cuídate mucho!`,
  },
  {
    name: 'Prospecto Partner Día 10 — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_dia_10', tone: 'directo',
    content: `Hola {{contact.full_name}}, es mi último mensaje. Si en el futuro quieres retomar la conversación sobre el negocio, escríbeme. La puerta siempre está abierta.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Q-Team Día 1
  // subcategory: 'partner_qteam_dia_1'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Q-Team Día 1 — General',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_1', tone: 'general',
    content: `Hola {{contact.full_name}}, ¡bienvenido al equipo! Estoy aquí para apoyarte en cada paso. El primer objetivo es el Q-Team: necesitamos 4 clientes con AutoOrder activo. ¿Tienes a alguien en mente?`,
  },
  {
    name: 'Fast Start Q-Team Día 1 — Amigable',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_1', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🎉 ¡Qué emoción que ya empezaste! Estoy aquí contigo en cada paso. Nuestro primer objetivo es el Q-Team: 4 clientes con AutoOrder. ¿A quién tienes en mente para empezar?`,
  },
  {
    name: 'Fast Start Q-Team Día 1 — Directo',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_1', tone: 'directo',
    content: `Hola {{contact.full_name}}, empezamos el Fast Start. Meta inmediata: Q-Team (4 clientes con AutoOrder activo). ¿Ya tienes tu lista de prospectos? Empecemos hoy.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Q-Team Día 7
  // subcategory: 'partner_qteam_dia_7'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Q-Team Día 7 — General',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_7', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿cómo vas en tu primera semana? ¿Cuántos clientes potenciales has contactado? Recuerda que el Q-Team requiere 4 clientes con AutoOrder. ¿En qué puedo ayudarte?`,
  },
  {
    name: 'Fast Start Q-Team Día 7 — Amigable',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_7', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🙌 ¡Una semana ya! ¿Cómo te ha ido? ¿Has podido hablar con tus prospectos? Cuéntame cómo va tu avance hacia el Q-Team.`,
  },
  {
    name: 'Fast Start Q-Team Día 7 — Directo',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_7', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿cuántos clientes activos llevas? Necesitamos 4 para el Q-Team. Si vas por debajo de lo esperado, hay que ajustar la estrategia hoy.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Q-Team Día 30
  // subcategory: 'partner_qteam_dia_30'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Q-Team Día 30 — General',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_30', tone: 'general',
    content: `Hola {{contact.full_name}}, llevamos 30 días. ¿Cómo va el avance hacia el Q-Team? ¿Ya tienes los 4 clientes activos? Es momento de revisar cómo estamos y ajustar si es necesario.`,
  },
  {
    name: 'Fast Start Q-Team Día 30 — Amigable',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_30', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🗓️ ¡Ya llevamos un mes! ¿Cómo vas con el Q-Team? Si ya tienes los 4 clientes, ¡felicidades! Si no, platiquemos para ver cómo aceleramos.`,
  },
  {
    name: 'Fast Start Q-Team Día 30 — Directo',
    category: 'seguimiento', subcategory: 'partner_qteam_dia_30', tone: 'directo',
    content: `Hola {{contact.full_name}}, 30 días de Fast Start. ¿Tienes los 4 clientes del Q-Team? Necesito un reporte de avance para saber si hay que cambiar la estrategia.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Nivel 1 Día 35
  // subcategory: 'partner_fs_n1_dia_35'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Nivel 1 Día 35 — General',
    category: 'seguimiento', subcategory: 'partner_fs_n1_dia_35', tone: 'general',
    content: `Hola {{contact.full_name}}, si ya tienes el Q-Team completo, el siguiente paso es el Nivel 1. Necesitamos un segundo partner para desbloquear ese bono. ¿Tienes a alguien listo?`,
  },
  {
    name: 'Fast Start Nivel 1 Día 35 — Amigable',
    category: 'seguimiento', subcategory: 'partner_fs_n1_dia_35', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🚀 Si ya tienes el Q-Team, ¡vamos por el Nivel 1! Solo necesitamos un partner más para ese bono. ¿A quién tienes en mente?`,
  },
  {
    name: 'Fast Start Nivel 1 Día 35 — Directo',
    category: 'seguimiento', subcategory: 'partner_fs_n1_dia_35', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿tienes el Q-Team? Si sí, hay que enfocarnos en Nivel 1: necesitas un segundo partner. ¿Quién es tu próximo prospecto de negocio?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Nivel 1 Día 60
  // subcategory: 'partner_fs_n1_dia_60'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Nivel 1 Día 60 — General',
    category: 'seguimiento', subcategory: 'partner_fs_n1_dia_60', tone: 'general',
    content: `Hola {{contact.full_name}}, llevamos 60 días. ¿Cómo va el Nivel 1? ¿Ya tienes tu segundo partner? Estamos a la mitad del Fast Start, es momento de acelerar.`,
  },
  {
    name: 'Fast Start Nivel 1 Día 60 — Amigable',
    category: 'seguimiento', subcategory: 'partner_fs_n1_dia_60', tone: 'amigable',
    content: `Hola {{contact.full_name}}! ¡2 meses ya! 🎯 ¿Cómo va el Nivel 1? Si ya tienes tu segundo partner, ¡increíble! Cuéntame cómo va todo.`,
  },
  {
    name: 'Fast Start Nivel 1 Día 60 — Directo',
    category: 'seguimiento', subcategory: 'partner_fs_n1_dia_60', tone: 'directo',
    content: `Hola {{contact.full_name}}, 60 días. ¿Tienes los 2 partners para el Nivel 1? Si no, necesitamos actuar rápido. Quedan 60 días del Fast Start.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Nivel 2 Día 75
  // subcategory: 'partner_fs_n2_dia_75'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Nivel 2 Día 75 — General',
    category: 'seguimiento', subcategory: 'partner_fs_n2_dia_75', tone: 'general',
    content: `Hola {{contact.full_name}}, si ya tienes el Nivel 1, el siguiente objetivo es el Nivel 2. Enfócate en ayudar a tus partners a construir su propio Q-Team. ¿Cómo puedo apoyarte?`,
  },
  {
    name: 'Fast Start Nivel 2 Día 75 — Amigable',
    category: 'seguimiento', subcategory: 'partner_fs_n2_dia_75', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🌟 ¡Vamos muy bien! Ahora el foco es el Nivel 2: ayudar a tus partners a crecer. ¿Cómo están avanzando ellos?`,
  },
  {
    name: 'Fast Start Nivel 2 Día 75 — Directo',
    category: 'seguimiento', subcategory: 'partner_fs_n2_dia_75', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿tus partners están construyendo su Q-Team? El Nivel 2 depende del avance de tu equipo. ¿Qué necesitan para acelerar?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — Nivel 2 Día 90
  // subcategory: 'partner_fs_n2_dia_90'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start Nivel 2 Día 90 — General',
    category: 'seguimiento', subcategory: 'partner_fs_n2_dia_90', tone: 'general',
    content: `Hola {{contact.full_name}}, 90 días. ¿Cómo va el Nivel 2? Quedan 30 días del Fast Start. Es momento de hacer un balance y enfocarse en lo que falta.`,
  },
  {
    name: 'Fast Start Nivel 2 Día 90 — Amigable',
    category: 'seguimiento', subcategory: 'partner_fs_n2_dia_90', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🏁 ¡Ya estamos en el día 90! Solo quedan 30 días. ¿Cómo están tus partners? ¡Podemos llegar al X-Team si nos enfocamos ahora!`,
  },
  {
    name: 'Fast Start Nivel 2 Día 90 — Directo',
    category: 'seguimiento', subcategory: 'partner_fs_n2_dia_90', tone: 'directo',
    content: `Hola {{contact.full_name}}, 90 días del Fast Start. Última recta. ¿Cuál es tu avance real? Necesito un reporte para saber si podemos llegar al X-Team.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — X-Team Día 110
  // subcategory: 'partner_xteam_dia_110'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start X-Team Día 110 — General',
    category: 'seguimiento', subcategory: 'partner_xteam_dia_110', tone: 'general',
    content: `Hola {{contact.full_name}}, quedan 10 días del Fast Start. El X-Team requiere 10 clientes Premier activos en total. ¿Cuántos llevamos? Hagamos el conteo final.`,
  },
  {
    name: 'Fast Start X-Team Día 110 — Amigable',
    category: 'seguimiento', subcategory: 'partner_xteam_dia_110', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🔥 ¡Solo 10 días! ¿Cuántos clientes Premier llevas? Si estamos cerca del X-Team, hay que dar el último empuje. ¡Tú puedes!`,
  },
  {
    name: 'Fast Start X-Team Día 110 — Directo',
    category: 'seguimiento', subcategory: 'partner_xteam_dia_110', tone: 'directo',
    content: `Hola {{contact.full_name}}, quedan 10 días. ¿Cuántos clientes Premier activos tienes? Si no llegamos a 10, hay que activar a todos los prospectos posibles esta semana.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER FAST START — X-Team Día 120
  // subcategory: 'partner_xteam_dia_120'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Fast Start X-Team Día 120 — General',
    category: 'seguimiento', subcategory: 'partner_xteam_dia_120', tone: 'general',
    content: `Hola {{contact.full_name}}, hoy es el último día de tu Fast Start. Sea cual sea el resultado, ha sido un gran aprendizaje. ¿Logramos el X-Team? Cuéntame cómo te sientes.`,
  },
  {
    name: 'Fast Start X-Team Día 120 — Amigable',
    category: 'seguimiento', subcategory: 'partner_xteam_dia_120', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🎊 ¡Llegaste al día 120! Estoy muy orgulloso de tu trabajo. ¿Cómo cerramos el Fast Start? ¡Cuéntame todo!`,
  },
  {
    name: 'Fast Start X-Team Día 120 — Directo',
    category: 'seguimiento', subcategory: 'partner_xteam_dia_120', tone: 'directo',
    content: `Hola {{contact.full_name}}, día 120. Fast Start terminado. ¿Cuál fue tu resultado final? Independientemente del resultado, el siguiente paso es mantener el momentum. ¿Hablamos?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER — Urgencia Q-Team
  // subcategory: 'partner_urgencia_qteam'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Urgencia Q-Team — General',
    category: 'seguimiento', subcategory: 'partner_urgencia_qteam', tone: 'general',
    content: `Hola {{contact.full_name}}, necesito hablar contigo con urgencia. El conteo de clientes activos ha bajado. Necesitamos recuperar los 4 clientes del Q-Team lo antes posible. ¿Cuándo puedes hablar?`,
  },
  {
    name: 'Urgencia Q-Team — Amigable',
    category: 'seguimiento', subcategory: 'partner_urgencia_qteam', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🚨 Hey, necesito hablar contigo. Algunos clientes dejaron de estar activos y necesitamos reactivarlos rápido para mantener el Q-Team. ¿Hablamos hoy?`,
  },
  {
    name: 'Urgencia Q-Team — Directo',
    category: 'seguimiento', subcategory: 'partner_urgencia_qteam', tone: 'directo',
    content: `Hola {{contact.full_name}}, URGENTE: el Q-Team está en riesgo. Necesitas reactivar clientes o conseguir nuevos HOY. Llámame cuando puedas.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — MSG 1: Mensaje de contacto
  // subcategory: 'prospecto_producto_msg_1'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto – Mensaje de contacto — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_1', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿cómo has estado? Hace tiempo que no hablamos y quería saludarte.`,
  },
  {
    name: 'Prospecto Producto – Mensaje de contacto — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_1', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 ¿Cómo has estado? Hace tiempo que no hablamos y quería ver cómo estás.`,
  },
  {
    name: 'Prospecto Producto – Mensaje de contacto — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_1', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿cómo estás? Hace tiempo que no hablamos. ¿Todo bien por allá?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — MSG 2: Invitación
  // subcategory: 'prospecto_producto_msg_2'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto – Invitación — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_2', tone: 'general',
    content: `Hola {{contact.full_name}}, estoy probando algo nuevo que está ayudando mucho con la salud celular. ¿Te gustaría que te cuente?`,
  },
  {
    name: 'Prospecto Producto – Invitación — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_2', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 Estoy probando algo nuevo que está ayudando mucho con la salud celular. ¡Creo que te puede interesar! ¿Te cuento?`,
  },
  {
    name: 'Prospecto Producto – Invitación — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_2', tone: 'directo',
    content: `Hola {{contact.full_name}}, estoy trabajando con algo nuevo relacionado a la salud celular. ¿Te interesa que te lo explique?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — MSG 3: Invitación a explicación
  // subcategory: 'prospecto_producto_msg_3'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto – Invitación a explicación — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_3', tone: 'general',
    content: `Oye {{contact.full_name}}, si quieres te puedo explicar rápido cómo funciona. ¿Te quedaría bien una llamada esta semana?`,
  },
  {
    name: 'Prospecto Producto – Invitación a explicación — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_3', tone: 'amigable',
    content: `Oye {{contact.full_name}}! 😊 Si quieres, te puedo explicar cómo funciona esto. ¿Te queda tiempo esta semana para platicar?`,
  },
  {
    name: 'Prospecto Producto – Invitación a explicación — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_3', tone: 'directo',
    content: `{{contact.full_name}}, ¿puedo explicarte cómo funciona? No te quito más de 15 minutos. ¿Esta semana puedes?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — MSG 4: Follow up
  // subcategory: 'prospecto_producto_msg_4'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto – Follow up — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_4', tone: 'general',
    content: `Hey {{contact.full_name}}, solo quería ver si alcanzaste a ver mi mensaje anterior.`,
  },
  {
    name: 'Prospecto Producto – Follow up — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_4', tone: 'amigable',
    content: `Hey {{contact.full_name}}! 😊 Solo quería ver si pudiste ver lo que te mandé. Sin presión.`,
  },
  {
    name: 'Prospecto Producto – Follow up — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_4', tone: 'directo',
    content: `{{contact.full_name}}, ¿pudiste ver mi mensaje? Quiero saber si te interesa.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — MSG 5: Segundo follow up
  // subcategory: 'prospecto_producto_msg_5'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto – Segundo follow up — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_5', tone: 'general',
    content: `Si no te interesa ahorita no pasa nada, {{contact.full_name}}, pero pensé que podría gustarte.`,
  },
  {
    name: 'Prospecto Producto – Segundo follow up — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_5', tone: 'amigable',
    content: `{{contact.full_name}}, sin ningún compromiso. 😊 Si no es el momento no pasa nada, pero pensé que podría gustarte.`,
  },
  {
    name: 'Prospecto Producto – Segundo follow up — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_5', tone: 'directo',
    content: `{{contact.full_name}}, ¿te interesa o no es para ti ahorita? Sin problema si no es el momento.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PRODUCTO — MSG 6: Último mensaje
  // subcategory: 'prospecto_producto_msg_6'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Producto – Último mensaje — General',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_6', tone: 'general',
    content: `Te mando un último mensaje por aquí para no molestarte, {{contact.full_name}}. Si algún día te interesa saber más, con gusto te cuento.`,
  },
  {
    name: 'Prospecto Producto – Último mensaje — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_6', tone: 'amigable',
    content: `{{contact.full_name}}, te mando un último mensaje para no molestarte. 😊 Si algún día quieres saber más, aquí estoy.`,
  },
  {
    name: 'Prospecto Producto – Último mensaje — Directo',
    category: 'seguimiento', subcategory: 'prospecto_producto_msg_6', tone: 'directo',
    content: `{{contact.full_name}}, último mensaje. Si en algún momento cambia tu situación y quieres saber más, avísame.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — MSG 1: Mensaje de contacto
  // subcategory: 'prospecto_partner_msg_1'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner – Mensaje de contacto — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_1', tone: 'general',
    content: `Hola {{contact.full_name}}, ¿cómo has estado? Hace tiempo que no hablamos y quería saludarte.`,
  },
  {
    name: 'Prospecto Partner – Mensaje de contacto — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_1', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 ¿Cómo has estado? Hace tiempo que no hablamos y quería ver cómo estás.`,
  },
  {
    name: 'Prospecto Partner – Mensaje de contacto — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_1', tone: 'directo',
    content: `Hola {{contact.full_name}}, ¿cómo estás? Hace tiempo que no hablamos. ¿Todo bien por allá?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — MSG 2: Invitación
  // subcategory: 'prospecto_partner_msg_2'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner – Invitación — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_2', tone: 'general',
    content: `Hola {{contact.full_name}}, estoy trabajando en un proyecto nuevo y creo que podría interesarte. ¿Te puedo contar rápido?`,
  },
  {
    name: 'Prospecto Partner – Invitación — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_2', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 Estoy trabajando en algo nuevo y pensé en ti. ¡Creo que te podría gustar! ¿Te cuento?`,
  },
  {
    name: 'Prospecto Partner – Invitación — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_2', tone: 'directo',
    content: `Hola {{contact.full_name}}, estoy en un proyecto nuevo y creo que tienes el perfil. ¿Te cuento de qué se trata?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — MSG 3: Invitación a explicación
  // subcategory: 'prospecto_partner_msg_3'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner – Invitación a explicación — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_3', tone: 'general',
    content: `Oye {{contact.full_name}}, si quieres te puedo explicar rápido cómo funciona. ¿Te quedaría bien una llamada esta semana?`,
  },
  {
    name: 'Prospecto Partner – Invitación a explicación — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_3', tone: 'amigable',
    content: `Oye {{contact.full_name}}! 😊 Si quieres, te puedo explicar cómo funciona esto. ¿Te queda tiempo esta semana para platicar?`,
  },
  {
    name: 'Prospecto Partner – Invitación a explicación — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_3', tone: 'directo',
    content: `{{contact.full_name}}, ¿puedo explicarte cómo funciona? No te quito más de 15 minutos. ¿Esta semana puedes?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — MSG 4: Follow up
  // subcategory: 'prospecto_partner_msg_4'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner – Follow up — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_4', tone: 'general',
    content: `Hey {{contact.full_name}}, solo quería ver si alcanzaste a ver mi mensaje anterior.`,
  },
  {
    name: 'Prospecto Partner – Follow up — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_4', tone: 'amigable',
    content: `Hey {{contact.full_name}}! 😊 Solo quería ver si pudiste ver lo que te mandé. Sin presión.`,
  },
  {
    name: 'Prospecto Partner – Follow up — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_4', tone: 'directo',
    content: `{{contact.full_name}}, ¿pudiste ver mi mensaje? Quiero saber si te interesa.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — MSG 5: Segundo follow up
  // subcategory: 'prospecto_partner_msg_5'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner – Segundo follow up — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_5', tone: 'general',
    content: `Si no te interesa ahorita no pasa nada, {{contact.full_name}}, pero pensé que podría gustarte.`,
  },
  {
    name: 'Prospecto Partner – Segundo follow up — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_5', tone: 'amigable',
    content: `{{contact.full_name}}, sin ningún compromiso. 😊 Si no es el momento no pasa nada, pero pensé que podría gustarte.`,
  },
  {
    name: 'Prospecto Partner – Segundo follow up — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_5', tone: 'directo',
    content: `{{contact.full_name}}, ¿te interesa o no es para ti ahorita? Sin problema si no es el momento.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PROSPECTO PARTNER — MSG 6: Último mensaje
  // subcategory: 'prospecto_partner_msg_6'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Prospecto Partner – Último mensaje — General',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_6', tone: 'general',
    content: `Te mando un último mensaje por aquí para no molestarte, {{contact.full_name}}. Si algún día te interesa saber más, con gusto te cuento.`,
  },
  {
    name: 'Prospecto Partner – Último mensaje — Amigable',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_6', tone: 'amigable',
    content: `{{contact.full_name}}, te mando un último mensaje para no molestarte. 😊 Si algún día quieres saber más, aquí estoy.`,
  },
  {
    name: 'Prospecto Partner – Último mensaje — Directo',
    category: 'seguimiento', subcategory: 'prospecto_partner_msg_6', tone: 'directo',
    content: `{{contact.full_name}}, último mensaje. Si en algún momento cambia tu situación y quieres saber más, avísame.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER SMART — Q-Team: necesita más clientes Premier
  // subcategory: 'partner_smart_qteam'
  // Contexto: upline apoya a su partner a llegar a 4 clientes activos
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Smart Q-Team — General',
    category: 'seguimiento', subcategory: 'partner_smart_qteam', tone: 'general',
    content: `Hola {{contact.full_name}}, quería ver cómo vas con tu avance en el Fast Start. Para llegar al Q-Team necesitas 4 clientes con AutoOrder activo. ¿Tienes prospectos en mente? Puedo ayudarte a cerrar los que faltan.`,
  },
  {
    name: 'Smart Q-Team — Amigable',
    category: 'seguimiento', subcategory: 'partner_smart_qteam', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🎯 Estoy aquí para apoyarte. Para el Q-Team necesitas 4 clientes activos. ¿A quién tienes en tu lista? Vamos juntos a cerrar los que faltan, ¡sé que puedes!`,
  },
  {
    name: 'Smart Q-Team — Directo',
    category: 'seguimiento', subcategory: 'partner_smart_qteam', tone: 'directo',
    content: `Hola {{contact.full_name}}, revisé tu avance y aún te faltan clientes para el Q-Team. Dame tu lista de prospectos y trabajamos en cerrarlos esta semana. ¿Cuándo hablamos?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER SMART — FS Nivel 1: necesita más sub-partners
  // subcategory: 'partner_smart_fs1'
  // Contexto: upline apoya a su partner a reclutar 2 partners propios
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Smart FS Nivel 1 — General',
    category: 'seguimiento', subcategory: 'partner_smart_fs1', tone: 'general',
    content: `Hola {{contact.full_name}}, ¡felicidades por el Q-Team! El siguiente paso es el Nivel 1: necesitas 2 partners activos. ¿Tienes a alguien en mente que pueda unirse a tu equipo? Puedo apoyarte a presentarles la oportunidad.`,
  },
  {
    name: 'Smart FS Nivel 1 — Amigable',
    category: 'seguimiento', subcategory: 'partner_smart_fs1', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🚀 ¡El Q-Team está listo, vamos por el Nivel 1! Para eso necesitas 2 partners tuyos. ¿Ya tienes personas que quieran sumarse? ¡Cuéntame y los ayudamos juntos!`,
  },
  {
    name: 'Smart FS Nivel 1 — Directo',
    category: 'seguimiento', subcategory: 'partner_smart_fs1', tone: 'directo',
    content: `Hola {{contact.full_name}}, Q-Team listo. Ahora necesitas 2 partners para el Nivel 1. ¿Tienes tu lista de prospectos de negocio? Hay que arrancar esta semana para llegar al bono.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER SMART — X-Team: necesita más clientes Premier (meta: 10)
  // subcategory: 'partner_smart_xteam'
  // Contexto: upline apoya a su partner a llegar a 10 clientes activos
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Smart X-Team — General',
    category: 'seguimiento', subcategory: 'partner_smart_xteam', tone: 'general',
    content: `Hola {{contact.full_name}}, ¡vamos muy bien! El X-Team requiere 10 clientes Premier activos en total. ¿Cuántos tienes ahorita? Platiquemos para ver cómo llegamos a la meta.`,
  },
  {
    name: 'Smart X-Team — Amigable',
    category: 'seguimiento', subcategory: 'partner_smart_xteam', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 🔥 ¡Ya estás en la recta final hacia el X-Team! Solo necesitas llegar a 10 clientes Premier activos. ¿Quién más de tu lista puede activarse? ¡Estamos cerca!`,
  },
  {
    name: 'Smart X-Team — Directo',
    category: 'seguimiento', subcategory: 'partner_smart_xteam', tone: 'directo',
    content: `Hola {{contact.full_name}}, estás a unos clientes del X-Team. Dame el estatus de tus prospectos y vemos cómo activamos los que faltan esta semana. ¿Hablamos hoy?`,
  },

  // ════════════════════════════════════════════════════════════════════
  // PARTNER SMART — Check-in Fast Start (semanal o mensual)
  // subcategory: 'partner_smart_checkin'
  // Contexto: check-in de avance con el partner durante Fast Start
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Check-in Fast Start — General',
    category: 'seguimiento', subcategory: 'partner_smart_checkin', tone: 'general',
    content: `Hola {{contact.full_name}}, te escribo para hacer un check-in rápido. ¿Cómo vas con tu Fast Start? ¿Hay algo en lo que pueda apoyarte esta semana?`,
  },
  {
    name: 'Check-in Fast Start — Amigable',
    category: 'seguimiento', subcategory: 'partner_smart_checkin', tone: 'amigable',
    content: `Hola {{contact.full_name}}! 😊 Solo paso a saludarte y ver cómo vas. ¿Cómo ha ido tu semana? ¿Necesitas algo de mi parte? Aquí estoy para lo que necesites.`,
  },
  {
    name: 'Check-in Fast Start — Directo',
    category: 'seguimiento', subcategory: 'partner_smart_checkin', tone: 'directo',
    content: `Hola {{contact.full_name}}, check-in rápido: ¿cuál es tu avance esta semana? ¿Qué lograste y qué tienes pendiente? Cuéntame para ver cómo acelero tu camino.`,
  },

  // ════════════════════════════════════════════════════════════════════
  // REFERIDO — Cliente / Partner (30 días desde registro)
  // subcategory: 'referido'
  // ════════════════════════════════════════════════════════════════════
  {
    name: 'Pedir Referido — General',
    category: 'seguimiento', subcategory: 'referido', tone: 'general',
    content: `Oye {{contact.full_name}}, una pregunta rápida. ¿Conoces a alguien que también quiera mejorar su salud? Podría ayudarle mucho.`,
  },
  {
    name: 'Pedir Referido — Amigable',
    category: 'seguimiento', subcategory: 'referido', tone: 'amigable',
    content: `Oye {{contact.full_name}}! 😊 Te hago una preguntita. ¿Conoces a alguien que pueda beneficiarse con lo que tú ya tienes? Con gusto le ayudo.`,
  },
  {
    name: 'Pedir Referido — Directo',
    category: 'seguimiento', subcategory: 'referido', tone: 'directo',
    content: `{{contact.full_name}}, ¿conoces a alguien que quiera mejorar su salud? Si me das un nombre, yo lo contacto.`,
  },
];
