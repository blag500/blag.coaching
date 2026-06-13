import { useState, useMemo } from 'react'
import styles from './HelpPage.module.css'

// ─── Knowledge base content ───────────────────────────────────────────────────

const KB = {
  bg: {
    search_placeholder: 'Търси в помощния център...',
    all_articles: 'Всички статии',
    popular: 'ПОПУЛЯРНИ СТАТИИ',
    categories_label: 'КАТЕГОРИИ',
    no_results: 'Няма резултати за',
    contact_title: 'Нямаш отговор?',
    contact_sub: 'Пиши директно на треньора от чат секцията в приложението.',
    open_app: 'Отвори приложението',
    back: '← Назад',
    back_to: '← Назад към',
    categories: [
      {
        id: 'start',
        icon: '🚀',
        color: '#FFB74D',
        title: 'Начало',
        desc: 'Регистрация, инсталиране, активиране',
        articles: [
          {
            id: 'what',
            title: 'Какво е Blag Coaching?',
            popular: true,
            body: `Blag Coaching е персонализирано фитнес приложение, създадено от треньор Благой за неговите клиенти. Работи като PWA (Progressive Web App) — инсталираш го на телефона си като обикновено приложение, без App Store или Google Play.

ЧЕТИРИТЕ СТЪЛБА НА ПРИЛОЖЕНИЕТО

• Хранене — проследявай макроси с AI търсене, баркод скенер и рецепти
• Тренировки — следвай плана си, логвай тежести и следи прогресията
• Навици — отбелязвай дневните си навици и виждай колко спазваш
• Комуникация — пиши директно на треньора и изпращай снимки

Приложението работи на всяко устройство — телефон, таблет, компютър.`,
          },
          {
            id: 'register',
            title: 'Как да се регистрирам?',
            popular: true,
            body: `СТЪПКИ ЗА РЕГИСТРАЦИЯ

1. Отиди на blag-coaching.com
2. Натисни "Регистрация" и въведи имейл + парола
3. Избери план (Plus или Pro)
4. Попълни контактна форма с твоето име и телефон
5. Изчакай треньорът да активира акаунта ти

ВАЖНО: Новорегистрираните клиенти виждат екран "Чакаш одобрение". Треньорът активира акаунта ти след като се запознае с теб. Обикновено отнема до 24 часа.`,
          },
          {
            id: 'install',
            title: 'Как да инсталирам приложението?',
            popular: true,
            body: `ИНСТАЛИРАНЕ НА IPHONE (Safari)

1. Отвори blag-coaching.com в Safari
2. Натисни бутона "Сподели" (квадрат със стрелка нагоре)
3. Избери "Добавяне към началния екран"
4. Натисни "Добавяне" — иконата се появява на Home Screen

ИНСТАЛИРАНЕ НА ANDROID (Chrome)

1. Отвори blag-coaching.com в Chrome
2. Натисни трите точки горе вдясно
3. Избери "Добавяне към началния екран" или "Инсталиране на приложение"
4. Потвърди — иконата се появява на Home Screen

ЗАЩО PWA?

Приложението се зарежда по-бързо след инсталиране, работи офлайн за основни функции и получава push известия — точно като нативно приложение, без да заема много място.`,
          },
          {
            id: 'pending',
            title: 'Акаунтът ми чака одобрение — какво да правя?',
            body: `Ако виждаш екрана "Чакаш одобрение", акаунтът ти е регистриран, но треньорът все още не е активирал достъпа.

ЩО ДА НАПРАВИШ

• Изчакай до 24 часа — треньорът ще получи известие за регистрацията ти
• Ако след 24 часа все още чакаш, пиши на треньора директно (имейл или телефон)
• Не е нужно да се регистрираш отново

СЛЕД ОДОБРЕНИЕ

Ще получиш достъп до всички функции на избрания план. Приложението ще се актуализира автоматично — просто опресни страницата.`,
          },
          {
            id: 'plans',
            title: 'Разлика между Plus и Pro?',
            body: `PLUS ПЛАН

Идеален за хора, които искат да проследяват самостоятелно:
• AI търсене на храни + баркод скенер
• Дневник на хранене с пълен контрол на макроси
• Рецепти с калкулатор на порции
• Тренировъчен план (зададен от треньора)
• Логване на упражнения и графики за прогресия
• Дневно проследяване на навици
• Лог на тегло с визуален прогрес

PRO ПЛАН

Всичко от Plus, плюс:
• Директен чат с треньора
• Изпращане на снимки в чата
• Персонализирани корекции на плана
• Пълна треньорска поддръжка`,
          },
        ],
      },
      {
        id: 'nutrition',
        icon: '🥗',
        color: '#66BB6A',
        title: 'Хранене',
        desc: 'Логване на храна, MealBot, рецепти',
        articles: [
          {
            id: 'log-food',
            title: 'Как да запиша храна?',
            popular: true,
            body: `РЪЧНО ВЪВЕЖДАНЕ

1. Отиди на таб "Хранене"
2. Натисни бутона "+" (долу вдясно)
3. Въведи името на храната в полето за търсене
4. Избери храната от резултатите
5. Въведи граматурата
6. Натисни "Запази"

РЕДАКЦИЯ И ИЗТРИВАНЕ

Всеки запис можеш да редактираш или изтриеш, като натиснеш върху него. Промените се запазват веднага.

UNDO (ОТКАЗ)

Ако изтриеш запис по грешка, натисни бутона "Undo" (появява се за няколко секунди след изтриване).`,
          },
          {
            id: 'barcode',
            title: 'Как работи баркод скенерът?',
            body: `Баркод скенерът разпознава продукти от базата данни OpenFoodFacts.

КАК ДА ГО ИЗПОЛЗВАШ

1. В хранителния дневник натисни иконата на баркод (до "+" бутона)
2. Позволи на браузъра достъп до камерата
3. Насочи камерата към баркода на продукта
4. Системата автоматично разпознава продукта и попълва макросите

АКО ПРОДУКТЪТ НЕ СЕ РАЗПОЗНАЕ

Не всички продукти (особено локални/български) са в базата данни. В такъв случай:
• Въведи ги ръчно с MealBot (AI търсене)
• Или добави ги като персонализирана храна`,
          },
          {
            id: 'mealbot',
            title: 'Какво е MealBot (AI асистент)?',
            popular: true,
            body: `MealBot е AI асистент, интегриран в хранителния дневник. Помага ти да намериш приблизителните макроси на всяка храна или ястие.

КАК РАБОТИ

1. В полето за търсене въведи храната на български или английски
2. MealBot търси в базата данни и дава предложения с типични порции
3. Избери предложение или коригирай граматурата
4. Запази записа

ВАЖНО ЗА ТОЧНОСТТА

MealBot дава приблизителни стойности. За максимална точност:
• Използвай баркод скенера за пакетирани продукти
• За домашно готвене претегляй съставките и ги въвеждай поотделно
• Рецептите са по-прецизен начин за сложни ястия`,
          },
          {
            id: 'recipes',
            title: 'Как да създам рецепта?',
            body: `Рецептите позволяват да запазиш сложни ястия с множество съставки и да ги логваш бързо след това.

СЪЗДАВАНЕ НА РЕЦЕПТА

1. Отиди на "Рецепти" в хранителния дневник
2. Натисни "Нова рецепта"
3. Въведи название и брой порции
4. Добавяй съставки (AI търсене, баркод или ръчно)
5. Запази рецептата

ЛОГВАНЕ НА РЕЦЕПТА

При логване избери дали записваш 1 порция или конкретен брой грамове. Макросите се изчисляват автоматично.

РЕЦЕПТИ ОТ ТРЕНЬОРА

Треньорът може да сподели рецепти с всички клиенти. Те се виждат в секцията "Рецепти" с иконка "споделено".`,
          },
          {
            id: 'meal-photos',
            title: 'Снимки на храна — как работят?',
            body: `Можеш да снимаш всеки запис в хранителния дневник. Снимките се виждат от треньора.

КАК ДА ДОБАВИШ СНИМКА

1. Запази записа на храната
2. Натисни върху него, за да го отвориш
3. Натисни иконата на камера
4. Избери снимка от галерията или направи нова
5. Снимката се качва и се свързва с този запис

ЗАЩО Е ПОЛЕЗНО

• Треньорът вижда реалните хранителни количества
• Помага за по-добра обратна връзка
• Снимките се пазят 30 дни в прегледа на треньора`,
          },
          {
            id: 'efficient',
            title: 'Ефективни продукти — какво е това?',
            body: `"Ефективни продукти" е общностна секция с препоръчани хранителни продукти с добро съотношение цена/качество и макроси.

КАК ДА РАЗГЛЕДАШ

1. Отиди на таб "Открий"
2. Избери "Ефективни продукти"
3. Разгледай списъка — сортиран по нови или по харесвания

КАКВО ПОКАЗВА ВСЕКИ ЗАПИС

• Название на продукта
• Магазин/源
• Приблизителна цена
• Макро показатели (напр. "Висок протеин")
• Снимка (ако е добавена)

ХАРЕСВАНЕ И ДОБАВЯНЕ

Можеш да дадеш 💪 на продукт или да добавиш нов. Треньорът добавя/верифицира продуктите.`,
          },
        ],
      },
      {
        id: 'training',
        icon: '💪',
        color: '#4FC3F7',
        title: 'Тренировка',
        desc: 'План, логване, прогресия',
        articles: [
          {
            id: 'plan',
            title: 'Как изглежда тренировъчният ми план?',
            popular: true,
            body: `Тренировъчният ти план е зададен от треньора специално за теб. Структуриран е в блокове.

СТРУКТУРА НА ПЛАНА

• Всеки ден може да има блок (напр. "Ден A — Push", "Ден B — Pull", "Почивка")
• Всеки блок съдържа упражнения с целеви серии × повторения
• Плановете се обновяват от треньора при нужда

АКО ВИЖДАШ "ПРОГРАМАТА СЕ ПОДГОТВЯ"

Означава, че треньорът все още не е задал твоя план. Стандартно се изготвя до 48 часа след одобрение на акаунта.`,
          },
          {
            id: 'log-workout',
            title: 'Как да запиша тренировка?',
            body: `ОТБЕЛЯЗВАНЕ НА БЛОК КАТО ПРИКЛЮЧЕН

1. Отиди на таб "Тренировка"
2. Виж кой блок е за днес
3. Натисни "Маркирай като приключен" след тренировката

ЛОГВАНЕ НА УПРАЖНЕНИЯ

За по-подробно проследяване:
1. Натисни върху конкретно упражнение в плана
2. Добавяй серии с тежест и повторения
3. Можеш да добавяш бележки към всяка серия
4. Данните се запазват автоматично

ИСТОРИЯ

Всички приключени тренировки се виждат в календара (таб "График").`,
          },
          {
            id: 'progression',
            title: 'Как да следя напредъка по упражнение?',
            body: `Функцията "Прогресия" показва историята на всяко упражнение — как се е развивала работната тежест с времето.

КАК ДА ДОСТЪПИШ

1. В таб "Тренировка" натисни върху упражнение
2. Превключи на таб "Прогресия" (горе вдясно)
3. Виждаш графика с максималната тежест per серия

КАКВО ОЗНАЧАВА ПРОГРЕСИЯТА

Нарастващата линия означава, че ставаш по-силен. Ако линията е плоска, може да се наложи промяна на плана — сподели с треньора.`,
          },
        ],
      },
      {
        id: 'habits',
        icon: '✅',
        color: '#AB47BC',
        title: 'Навици & Прогрес',
        desc: 'Дневни навици, check-in, тегло',
        articles: [
          {
            id: 'habits-daily',
            title: 'Как работят дневните навици?',
            popular: true,
            body: `Навиците са малки ежедневни действия, зададени от треньора специално за теб.

ПРИМЕРНИ НАВИЦИ

• Изпий 3л вода
• Яж ≥30г протеин на закуска
• Стъпки (8000+)
• 8 часа сън
• Тренировка

КАК ДА ГИ ОТБЕЛЯЗВАШ

1. Отиди на таб "Навици" (или "Compliance")
2. Натисни върху навика, за да го отбележиш като изпълнен
3. Отбелязвай всеки ден — изградени са стрийкове

СТРИЙК И ИСТОРИЯ

В горната част виждаш текущия стрийк (поредни дни без пропуск). В секцията "Календар" виждаш последните 4 седмици.`,
          },
          {
            id: 'checkin',
            title: 'Как да попълня check-in формата?',
            body: `Check-in формата е дневен отчет за треньора. Попълва се веднъж дневно.

ПОЛЕТА В ФОРМАТА

• Тегло (кг) — текущото ти тегло
• Сън (часове) — колко часа спа
• Ниво на тренировката — ↓ По-лесна / = Нормална / ↑ По-трудна
• Желание за тренировка — скала 0–5
• Бележка — всичко, което искаш да сподели с треньора
• Снимка за прогрес — незадължително

СЕДМИЧЕН РАЗДЕЛ (разгъва се в петък/събота)

• "Победа на седмицата" — нещо, с което си доволен
• "Що да подобря" — честна самооценка

КОГА ДА ПОПЪЛНИШ

Препоръчително е сутрин, след ставане. Данните от check-in формата са видими за треньора.`,
          },
          {
            id: 'weight',
            title: 'Как да запиша теглото си?',
            body: `Теглото може да се запише по два начина:

ЧРЕЗ CHECK-IN ФОРМАТА

Полето "Тегло (кг)" в check-in формата автоматично се записва и в историята на теглото.

ЧРЕЗ ПРОФИЛ СТРАНИЦАТА

1. Отиди на таб "Профил"
2. Намери секцията "Тегло"
3. Въведи теглото и натисни "Запази"

ГРАФИКАТА

В "Профил" виждаш SVG графика с теглото за последните 30 дни (1М), 90 дни (3М) или всички записи (ВСЕ). Инструментът показва тренд и статистики.`,
          },
          {
            id: 'inspiration',
            title: 'Какво показва ВДЪХНОВЕНИЕ?',
            body: `Страницата ВДЪХНОВЕНИЕ (в таб "Открий") показва реалните тренировки и начина на живот на треньора.

КАКВО ЩЕ ВИДИШ

• Профилна снимка и стрийк на треньора
• Тренировъчни точки за последните 7 дни (💪 = тренирал, 💤 = почивка)
• Ленти за изпълнение на навиците
• Статистики за деня (ккал, навици, сън, тренинг)
• Check-in снимки на треньора (последните 60 дни)

ПУБЛИКАЦИИ

Под живия профил на треньора са неговите публикации — статии и вдъхновение за тренинг и хранене.`,
          },
          {
            id: 'progress-photos',
            title: 'Прогрес снимки — как работят?',
            body: `Снимките за прогрес се прикачат към check-in формата.

КАК ДА ДОБАВИШ СНИМКА

1. Отвори check-in формата (в "Профил")
2. Превъртай надолу до секцията "Снимка"
3. Натисни "Добавяне на снимка"
4. Избери от галерията или направи нова
5. Запази формата

ВИДИМОСТ

Снимките за прогрес са видими за треньора в клиентската му страница, под таб "CHECK-IN". Само треньорът и ти имате достъп.`,
          },
        ],
      },
      {
        id: 'chat',
        icon: '💬',
        color: '#FFB74D',
        title: 'Чат',
        desc: 'Съобщения, снимки, известия',
        articles: [
          {
            id: 'messaging',
            title: 'Как да пиша на треньора?',
            popular: true,
            body: `Чатът с треньора е достъпен от таб "ЧАТ" в навигационната лента.

КАК ДА ИЗПРАТИШ СЪОБЩЕНИЕ

1. Натисни таб "ЧАТ"
2. Въведи текст в полето долу
3. Натисни стрелката за изпращане (или Enter)

ДАТА РАЗДЕЛИТЕЛИ

Съобщенията са групирани по дни — ДНЕС, ВЧЕРА, или дата. Историята се пази неограничено.

ИЗВЕСТИЯ

Ако треньорът ти пише, ще получиш push известие (ако са включени). Виждаш и бадж с брой непрочетени върху иконката на чата.`,
          },
          {
            id: 'chat-photos',
            title: 'Как да изпратя снимка в чата?',
            body: `Можеш да изпращаш снимки директно в чата с треньора.

СТЪПКИ

1. В чат страницата натисни иконата на камерата (вляво от текстовото поле)
2. Избери снимка от галерията или направи нова
3. Снимката се качва и изпраща автоматично

ГЛЕДАНЕ НА СНИМКИ

Натисни върху получена/изпратена снимка, за да я видиш в пълен екран.

РАЗМЕР И ФОРМАТ

Приемат се всички стандартни формати (JPG, PNG, HEIC). Максималният размер зависи от браузъра.`,
          },
          {
            id: 'notifications',
            title: 'Push известия — как да ги включа?',
            body: `Push известията ти дават знак, когато треньорът ти изпрати съобщение — дори когато приложението е затворено.

ВКЛЮЧВАНЕ

1. Отиди на таб "Профил"
2. Намери секцията "Известия"
3. Натисни "Включи известия"
4. Потвърди в изскачащото прозорче на браузъра

НА IPHONE

Push известията работят само ако приложението е инсталирано на Home Screen (чрез Safari). Добавянето в браузъра без инсталиране не поддържа push на iOS.

АКО ИЗВЕСТИЯТА НЕ РАБОТЯТ

• Провери дали приложението е инсталирано (не само в браузъра)
• На iOS: Настройки → Известия → blag-coaching.com → Включи
• На Android: Настройки на Chrome → Известия за сайта`,
          },
        ],
      },
      {
        id: 'profile',
        icon: '⚙️',
        color: '#FF7043',
        title: 'Профил & Настройки',
        desc: 'Аватар, тема, език, макроси',
        articles: [
          {
            id: 'avatar',
            title: 'Как да сменя профилната снимка?',
            body: `1. Отиди на таб "Профил"
2. Натисни върху кръглата снимка/аватар горе вляво
3. Избери снимка от галерията или направи нова
4. Снимката се качва и обновява автоматично

Профилната снимка се вижда от треньора и в чат заглавката.`,
          },
          {
            id: 'theme-lang',
            title: 'Тема и език на приложението',
            body: `СМЯНА НА ТЕМА (ТЪМНА / СВЕТЛА)

1. Отиди на таб "Профил"
2. Превъртай надолу до секцията "ИЗГЛЕД"
3. Избери 🌙 ТЪМЕН или ☀️ СВЕТЪЛ

По подразбиране е тъмна тема. Изборът се запазва и при следващо отваряне.

СМЯНА НА ЕЗИК (БГ / EN)

В същата секция "ИЗГЛЕД":
1. Под "Език" избери БГ или EN
2. Всички надписи в навигацията се обновяват мигновено`,
          },
          {
            id: 'macros',
            title: 'Как се задават макро целите ми?',
            body: `Макро целите (ккал, протеин, въглехидрати, мазнини) се задават от треньора.

КЪДЕ ДА ГИ ВИДИШ

• Таб "Хранене" — прогрес ленти показват текущо спрямо цел
• Таб "Профил" — секция "Макро цели"

АКО ЦЕЛИТЕ СА 0 ИЛИ НЕ СА ЗАДАДЕНИ

Свържи се с треньора — той трябва да ги зададе от неговото табло за управление. Обикновено се задават при активирането на акаунта.`,
          },
          {
            id: 'name',
            title: 'Как да сменя името си?',
            body: `1. Отиди на таб "Профил"
2. Намери секцията с текущото ти име
3. Редактирай го в текстовото поле
4. Натисни "Запази"

Името се вижда от треньора в неговото табло. Ако промяната не се запазва, провери интернет връзката.`,
          },
        ],
      },
      {
        id: 'technical',
        icon: '🔧',
        color: '#78909C',
        title: 'Технически',
        desc: 'Офлайн режим, проблеми, устройства',
        articles: [
          {
            id: 'offline',
            title: 'Как работи офлайн режимът?',
            body: `Blag Coaching е PWA (Progressive Web App) с офлайн кеш.

РАБОТИ БЕЗ ИНТЕРНЕТ

• Разглеждане на записани данни (храна, тренировки, навици)
• Четене на тренировъчния план
• Разглеждане на история

ИЗИСКВА ИНТЕРНЕТ

• Запазване на нови записи
• Синхронизация с треньора
• Изпращане на съобщения
• Качване на снимки
• Получаване на новини и актуализации`,
          },
          {
            id: 'troubleshoot',
            title: 'Приложението не зарежда — какво да направя?',
            popular: true,
            body: `СТЪПКИ ЗА ОТСТРАНЯВАНЕ НА ПРОБЛЕМИ

1. Провери интернет връзката
2. Опресни страницата (дръпни надолу от горния край или натисни F5)
3. Изчисти кеша на браузъра (Настройки → История → Изчисти данни)
4. Ако използваш инсталираната версия, деинсталирай и инсталирай отново
5. Опитай в инкогнито режим (ако работи там, проблемът е в разширенията)

АКО ПРОБЛЕМЪТ ПРОДЪЛЖАВА

Пиши на треньора в чата с описание на проблема и вида на устройството/браузъра.`,
          },
          {
            id: 'iphone-install',
            title: 'Подробно инсталиране на iPhone',
            body: `ИЗИСКВАНИЯ

• iPhone с iOS 16.4 или по-нова версия
• Браузър Safari (Chrome на iOS не поддържа PWA инсталиране)

СТЪПКИ

1. Отвори Safari и отиди на blag-coaching.com
2. Изчакай страницата да се зареди напълно
3. Натисни иконата "Сподели" в долната лента (квадрат со стрелка нагоре)
4. Превъртай надолу в менюто и избери "Добавяне към началния екран"
5. Можеш да промениш името, после натисни "Добавяне"
6. Иконата се появява на Home Screen

PUSH ИЗВЕСТИЯ НА IPHONE

След инсталиране:
1. Отвори приложението от Home Screen (не от Safari)
2. Отиди на Профил → Известия → Включи
3. Потвърди разрешението`,
          },
          {
            id: 'android-install',
            title: 'Подробно инсталиране на Android',
            body: `ПРЕПОРЪЧАН БРАУЗЪР: Chrome

СТЪПКИ С CHROME

1. Отвори Chrome и отиди на blag-coaching.com
2. Натисни трите точки (⋮) горе вдясно
3. Избери "Добавяне към началния екран" или "Инсталиране на приложение"
4. Потвърди — иконата се появява в App Drawer и на Home Screen

С FIREFOX ИЛИ ДРУГ БРАУЗЪР

Процесът е подобен — търси опция "Инсталиране" или "Добавяне към началния екран" в менюто.

СЛЕД ИНСТАЛИРАНЕ

Приложението работи като нативно. Известията се активират от Профил → Известия.`,
          },
        ],
      },
    ],
  },
  en: {
    search_placeholder: 'Search the help centre...',
    all_articles: 'All articles',
    popular: 'POPULAR ARTICLES',
    categories_label: 'CATEGORIES',
    no_results: 'No results for',
    contact_title: 'Still need help?',
    contact_sub: 'Message your coach directly from the Chat tab inside the app.',
    open_app: 'Open app',
    back: '← Back',
    back_to: '← Back to',
    categories: [
      {
        id: 'start',
        icon: '🚀',
        color: '#FFB74D',
        title: 'Getting Started',
        desc: 'Registration, installation, activation',
        articles: [
          {
            id: 'what',
            title: 'What is Blag Coaching?',
            popular: true,
            body: `Blag Coaching is a personalised fitness app built by coach Blag for his clients. It runs as a PWA (Progressive Web App) — you install it on your phone like a normal app, without the App Store or Google Play.

THE FOUR PILLARS

• Nutrition — track macros with AI search, barcode scanner and recipes
• Training — follow your plan, log weights and track progression
• Habits — check off daily habits and see your compliance rate
• Communication — message your coach directly and send photos

The app works on any device — phone, tablet, desktop.`,
          },
          {
            id: 'register',
            title: 'How do I register?',
            popular: true,
            body: `REGISTRATION STEPS

1. Go to blag-coaching.com
2. Click "Register" and enter your email + password
3. Choose a plan (Plus or Pro)
4. Fill in the contact form with your name and phone
5. Wait for your coach to activate your account

IMPORTANT: Newly registered clients see a "Pending Approval" screen. Your coach activates your account after getting in touch with you. This typically takes up to 24 hours.`,
          },
          {
            id: 'install',
            title: 'How do I install the app?',
            popular: true,
            body: `INSTALL ON IPHONE (Safari)

1. Open blag-coaching.com in Safari
2. Tap the Share button (square with arrow pointing up)
3. Select "Add to Home Screen"
4. Tap "Add" — the icon appears on your Home Screen

INSTALL ON ANDROID (Chrome)

1. Open blag-coaching.com in Chrome
2. Tap the three dots in the top right
3. Select "Add to Home Screen" or "Install App"
4. Confirm — the icon appears on your Home Screen

WHY PWA?

The app loads faster after installation, works offline for core features and receives push notifications — just like a native app, without taking up much space.`,
          },
          {
            id: 'pending',
            title: 'My account is pending — what should I do?',
            body: `If you see the "Pending Approval" screen, your account is registered but your coach hasn't activated it yet.

WHAT TO DO

• Wait up to 24 hours — your coach receives a notification about your registration
• If still pending after 24 hours, contact your coach directly (email or phone)
• You don't need to register again

AFTER APPROVAL

You'll get full access to all features of your chosen plan. The app will update automatically — just refresh the page.`,
          },
          {
            id: 'plans',
            title: 'Difference between Plus and Pro?',
            body: `PLUS PLAN

Ideal for independent tracking:
• AI food search + barcode scanner
• Daily food log with full macro control
• Recipe builder with portion calculator
• Training plan (set by your coach)
• Exercise logging & progression charts
• Daily habit tracking
• Weight log with visual progress

PRO PLAN

Everything in Plus, plus:
• Direct chat with your coach
• Photo messages
• Personalised plan adjustments
• Full coaching relationship`,
          },
        ],
      },
      {
        id: 'nutrition',
        icon: '🥗',
        color: '#66BB6A',
        title: 'Nutrition',
        desc: 'Food logging, MealBot, recipes',
        articles: [
          {
            id: 'log-food',
            title: 'How do I log food?',
            popular: true,
            body: `MANUAL ENTRY

1. Go to the "Nutrition" tab
2. Tap the "+" button (bottom right)
3. Enter the food name in the search field
4. Select the food from results
5. Enter the weight in grams
6. Tap "Save"

EDITING AND DELETING

Tap any entry to edit or delete it. Changes save immediately.

UNDO

If you delete an entry by mistake, tap the "Undo" button (appears for a few seconds after deletion).`,
          },
          {
            id: 'barcode',
            title: 'How does the barcode scanner work?',
            body: `The barcode scanner searches the OpenFoodFacts database.

HOW TO USE IT

1. In the food diary, tap the barcode icon (next to the "+" button)
2. Allow the browser access to the camera
3. Point the camera at the product barcode
4. The system automatically recognises the product and fills in the macros

IF A PRODUCT ISN'T RECOGNISED

Not all products (especially local ones) are in the database. In that case:
• Enter them manually using MealBot (AI search)
• Or add them as a custom food`,
          },
          {
            id: 'mealbot',
            title: 'What is MealBot (AI assistant)?',
            popular: true,
            body: `MealBot is an AI assistant integrated into the food diary. It helps you find approximate macros for any food or dish.

HOW IT WORKS

1. Type the food name (in English or Bulgarian) in the search field
2. MealBot searches the database and gives suggestions with typical portions
3. Select a suggestion or adjust the weight
4. Save the entry

ACCURACY NOTE

MealBot gives approximate values. For maximum accuracy:
• Use the barcode scanner for packaged products
• For home cooking, weigh ingredients and enter them separately
• Recipes are more precise for complex dishes`,
          },
          {
            id: 'recipes',
            title: 'How do I create a recipe?',
            body: `Recipes let you save complex dishes with multiple ingredients and log them quickly later.

CREATING A RECIPE

1. Go to "Recipes" in the food diary
2. Tap "New Recipe"
3. Enter a name and number of servings
4. Add ingredients (AI search, barcode or manual)
5. Save the recipe

LOGGING A RECIPE

When logging, choose whether to record 1 serving or a specific number of grams. Macros are calculated automatically.

COACH RECIPES

Your coach can share recipes with all clients. These appear in the "Recipes" section with a "shared" icon.`,
          },
          {
            id: 'meal-photos',
            title: 'Meal photos — how do they work?',
            body: `You can photograph any entry in the food diary. Photos are visible to your coach.

HOW TO ADD A PHOTO

1. Save the food entry
2. Tap it to open it
3. Tap the camera icon
4. Choose a photo from the gallery or take a new one
5. The photo uploads and links to that entry

WHY IT'S USEFUL

• Your coach sees your actual food portions
• Enables better feedback
• Photos are kept for 30 days in the coach's view`,
          },
          {
            id: 'efficient',
            title: 'Efficient Products — what is it?',
            body: `"Efficient Products" is a community section with recommended food products that offer a good macro-to-price ratio.

HOW TO BROWSE

1. Go to the "Explore" tab
2. Select "Efficient Products"
3. Browse the list — sorted by newest or most liked

WHAT EACH ENTRY SHOWS

• Product name
• Store / source
• Approximate price
• Macro indicators (e.g. "High protein")
• Photo (if added)

LIKING AND ADDING

You can give 💪 to a product or add a new one. Your coach adds/verifies products.`,
          },
        ],
      },
      {
        id: 'training',
        icon: '💪',
        color: '#4FC3F7',
        title: 'Training',
        desc: 'Plan, logging, progression',
        articles: [
          {
            id: 'plan',
            title: 'What does my training plan look like?',
            popular: true,
            body: `Your training plan is set by your coach specifically for you. It's structured in blocks.

PLAN STRUCTURE

• Each day can have a block (e.g. "Day A — Push", "Day B — Pull", "Rest")
• Each block contains exercises with target sets × reps
• Plans are updated by your coach as needed

IF YOU SEE "PROGRAMME BEING PREPARED"

It means your coach hasn't set your plan yet. It's typically prepared within 48 hours of account approval.`,
          },
          {
            id: 'log-workout',
            title: 'How do I log a workout?',
            body: `MARKING A BLOCK AS COMPLETE

1. Go to the "Training" tab
2. See which block is for today
3. Tap "Mark as complete" after your workout

LOGGING EXERCISES

For more detailed tracking:
1. Tap on a specific exercise in the plan
2. Add sets with weight and reps
3. You can add notes to each set
4. Data saves automatically

HISTORY

All completed workouts are visible in the calendar (Schedule tab).`,
          },
          {
            id: 'progression',
            title: 'How do I track exercise progression?',
            body: `The "Progression" feature shows the history of each exercise — how working weight has developed over time.

HOW TO ACCESS

1. In the "Training" tab, tap on an exercise
2. Switch to the "Progression" tab (top right)
3. You'll see a chart with maximum weight per set

WHAT PROGRESSION MEANS

An upward trend means you're getting stronger. If the line is flat, a plan change may be needed — share this with your coach.`,
          },
        ],
      },
      {
        id: 'habits',
        icon: '✅',
        color: '#AB47BC',
        title: 'Habits & Progress',
        desc: 'Daily habits, check-in, weight',
        articles: [
          {
            id: 'habits-daily',
            title: 'How do daily habits work?',
            popular: true,
            body: `Habits are small daily actions set by your coach specifically for you.

EXAMPLE HABITS

• Drink 3L of water
• Eat ≥30g protein at breakfast
• Steps (8000+)
• 8 hours of sleep
• Workout

HOW TO CHECK THEM OFF

1. Go to the "Habits" tab
2. Tap a habit to mark it as done
3. Check them off every day — streaks are built

STREAK AND HISTORY

At the top you see your current streak (consecutive days without a miss). In the "Calendar" section you see the last 4 weeks.`,
          },
          {
            id: 'checkin',
            title: 'How do I fill in the check-in form?',
            body: `The check-in form is a daily report for your coach. Fill it in once a day.

FORM FIELDS

• Weight (kg) — your current weight
• Sleep (hours) — how many hours you slept
• Workout level — ↓ Easier / = Normal / ↑ Harder
• Training desire — scale 0–5
• Note — anything you want to share with your coach
• Progress photo — optional

WEEKLY SECTION (expands on Friday/Saturday)

• "Week's win" — something you're proud of
• "What to improve" — honest self-assessment

WHEN TO FILL IT IN

Morning, after waking up is recommended. Check-in data is visible to your coach.`,
          },
          {
            id: 'weight',
            title: 'How do I log my weight?',
            body: `Weight can be recorded in two ways:

VIA THE CHECK-IN FORM

The "Weight (kg)" field in the check-in form automatically saves to your weight history.

VIA THE PROFILE PAGE

1. Go to the "Profile" tab
2. Find the "Weight" section
3. Enter your weight and tap "Save"

THE CHART

In "Profile" you see a chart with weight for the last 30 days (1M), 90 days (3M) or all entries (ALL).`,
          },
          {
            id: 'inspiration',
            title: 'What does the INSPIRATION page show?',
            body: `The INSPIRATION page (in the "Explore" tab) shows your coach's real training data and lifestyle.

WHAT YOU'LL SEE

• Coach's profile photo and training streak
• Training dots for the last 7 days (💪 = trained, 💤 = rest)
• Habit completion bars
• Day stats (kcal, habits, sleep, training)
• Coach's check-in photos (last 60 days)

POSTS

Below the coach's live profile are their posts — articles and inspiration for training and nutrition.`,
          },
          {
            id: 'progress-photos',
            title: 'Progress photos — how do they work?',
            body: `Progress photos are attached to the check-in form.

HOW TO ADD A PHOTO

1. Open the check-in form (in "Profile")
2. Scroll down to the "Photo" section
3. Tap "Add photo"
4. Choose from gallery or take a new one
5. Save the form

VISIBILITY

Progress photos are visible to your coach under the "CHECK-IN" tab. Only your coach and you have access.`,
          },
        ],
      },
      {
        id: 'chat',
        icon: '💬',
        color: '#FFB74D',
        title: 'Chat',
        desc: 'Messages, photos, notifications',
        articles: [
          {
            id: 'messaging',
            title: 'How do I message my coach?',
            popular: true,
            body: `The chat is accessible from the "CHAT" tab in the navigation bar.

HOW TO SEND A MESSAGE

1. Tap the "CHAT" tab
2. Type your message in the field at the bottom
3. Tap the send arrow (or press Enter)

DATE SEPARATORS

Messages are grouped by day — TODAY, YESTERDAY, or date. History is kept indefinitely.

NOTIFICATIONS

If your coach writes to you, you'll receive a push notification (if enabled). You'll also see a badge with the unread count on the chat icon.`,
          },
          {
            id: 'chat-photos',
            title: 'How do I send a photo in chat?',
            body: `You can send photos directly in the chat with your coach.

STEPS

1. In the chat page, tap the camera icon (left of the text field)
2. Select a photo from your gallery or take a new one
3. The photo uploads and sends automatically

VIEWING PHOTOS

Tap a received/sent photo to view it fullscreen.`,
          },
          {
            id: 'notifications',
            title: 'Push notifications — how do I enable them?',
            body: `Push notifications alert you when your coach sends a message — even when the app is closed.

ENABLING

1. Go to the "Profile" tab
2. Find the "Notifications" section
3. Tap "Enable notifications"
4. Confirm in the browser pop-up

ON IPHONE

Push notifications only work if the app is installed on the Home Screen (via Safari). Using it in the browser without installing doesn't support push on iOS.

IF NOTIFICATIONS DON'T WORK

• Check the app is installed (not just in the browser)
• On iOS: Settings → Notifications → blag-coaching.com → Turn on
• On Android: Chrome Settings → Site Notifications`,
          },
        ],
      },
      {
        id: 'profile',
        icon: '⚙️',
        color: '#FF7043',
        title: 'Profile & Settings',
        desc: 'Avatar, theme, language, macros',
        articles: [
          {
            id: 'avatar',
            title: 'How do I change my profile photo?',
            body: `1. Go to the "Profile" tab
2. Tap the circular photo/avatar in the top left
3. Select a photo from your gallery or take a new one
4. The photo uploads and updates automatically

Your profile photo is visible to your coach and in the chat header.`,
          },
          {
            id: 'theme-lang',
            title: 'App theme and language',
            body: `CHANGING THEME (DARK / LIGHT)

1. Go to the "Profile" tab
2. Scroll down to the "APPEARANCE" section
3. Select 🌙 DARK or ☀️ LIGHT

Dark mode is the default. Your choice is saved for future sessions.

CHANGING LANGUAGE (BG / EN)

In the same "APPEARANCE" section:
1. Under "Language" select BG or EN
2. All navigation labels update instantly`,
          },
          {
            id: 'macros',
            title: 'How are my macro targets set?',
            body: `Macro targets (kcal, protein, carbs, fat) are set by your coach.

WHERE TO SEE THEM

• "Nutrition" tab — progress bars show current vs target
• "Profile" tab — "Macro targets" section

IF TARGETS ARE 0 OR NOT SET

Contact your coach — they need to set them from their dashboard. They're typically set when activating your account.`,
          },
          {
            id: 'name',
            title: 'How do I change my name?',
            body: `1. Go to the "Profile" tab
2. Find the section with your current name
3. Edit it in the text field
4. Tap "Save"

Your name is visible to your coach in their dashboard.`,
          },
        ],
      },
      {
        id: 'technical',
        icon: '🔧',
        color: '#78909C',
        title: 'Technical',
        desc: 'Offline mode, troubleshooting',
        articles: [
          {
            id: 'offline',
            title: 'How does offline mode work?',
            body: `Blag Coaching is a PWA with offline caching.

WORKS WITHOUT INTERNET

• Browsing saved data (food, workouts, habits)
• Reading your training plan
• Viewing history

REQUIRES INTERNET

• Saving new entries
• Syncing with your coach
• Sending messages
• Uploading photos
• Receiving updates`,
          },
          {
            id: 'troubleshoot',
            title: "The app won't load — what do I do?",
            popular: true,
            body: `TROUBLESHOOTING STEPS

1. Check your internet connection
2. Refresh the page (pull down from the top or press F5)
3. Clear the browser cache (Settings → History → Clear data)
4. If using the installed version, uninstall and reinstall
5. Try in incognito mode (if it works there, the issue is an extension)

IF THE PROBLEM PERSISTS

Message your coach with a description of the issue and your device/browser type.`,
          },
          {
            id: 'iphone-install',
            title: 'Detailed install guide — iPhone',
            body: `REQUIREMENTS

• iPhone with iOS 16.4 or later
• Safari browser (Chrome on iOS doesn't support PWA installation)

STEPS

1. Open Safari and go to blag-coaching.com
2. Wait for the page to fully load
3. Tap the "Share" icon in the bottom bar (square with arrow pointing up)
4. Scroll down in the menu and select "Add to Home Screen"
5. You can rename it, then tap "Add"
6. The icon appears on your Home Screen

PUSH NOTIFICATIONS ON IPHONE

After installation:
1. Open the app from the Home Screen (not from Safari)
2. Go to Profile → Notifications → Enable
3. Confirm the permission`,
          },
          {
            id: 'android-install',
            title: 'Detailed install guide — Android',
            body: `RECOMMENDED BROWSER: Chrome

STEPS WITH CHROME

1. Open Chrome and go to blag-coaching.com
2. Tap the three dots (⋮) in the top right
3. Select "Add to Home Screen" or "Install App"
4. Confirm — the icon appears in the App Drawer and on the Home Screen

WITH FIREFOX OR ANOTHER BROWSER

The process is similar — look for an "Install" or "Add to Home Screen" option in the menu.

AFTER INSTALLATION

The app works like a native app. Notifications are activated from Profile → Notifications.`,
          },
        ],
      },
    ],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [lang,     setLang]     = useState('bg')
  const [query,    setQuery]    = useState('')
  const [catId,    setCatId]    = useState(null)
  const [articleId, setArticleId] = useState(null)

  const t = KB[lang]

  // Flatten all articles for search
  const allArticles = useMemo(() =>
    t.categories.flatMap(cat =>
      cat.articles.map(a => ({ ...a, catId: cat.id, catTitle: cat.title, catColor: cat.color }))
    ), [t])

  const popularArticles = useMemo(() =>
    allArticles.filter(a => a.popular).slice(0, 6), [allArticles])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q)
    )
  }, [query, allArticles])

  const selectedCat     = catId     ? t.categories.find(c => c.id === catId)     : null
  const selectedArticle = articleId ? allArticles.find(a => a.id === articleId && a.catId === catId) : null

  function openArticle(cId, aId) {
    setCatId(cId)
    setArticleId(aId)
    window.scrollTo(0, 0)
  }

  function openCategory(cId) {
    setCatId(cId)
    setArticleId(null)
    window.scrollTo(0, 0)
  }

  function goHome() {
    setCatId(null)
    setArticleId(null)
    setQuery('')
    window.scrollTo(0, 0)
  }

  // ── Render: Article detail
  if (selectedArticle) {
    return (
      <PageShell lang={lang} setLang={setLang} t={t}>
        <div className={styles.kbInner}>
          <nav className={styles.breadcrumb}>
            <button className={styles.breadLink} onClick={goHome} type="button">Help</button>
            <span className={styles.breadSep}>›</span>
            <button className={styles.breadLink} onClick={() => { setArticleId(null); window.scrollTo(0,0) }} type="button">
              {selectedCat?.title}
            </button>
            <span className={styles.breadSep}>›</span>
            <span className={styles.breadCurrent}>{selectedArticle.title}</span>
          </nav>

          <div className={styles.articleDetail}>
            <span className={styles.articleCatBadge} style={{ background: selectedCat?.color + '22', color: selectedCat?.color }}>
              {selectedCat?.icon} {selectedCat?.title}
            </span>
            <h1 className={styles.articleDetailTitle}>{selectedArticle.title}</h1>
            <div className={styles.articleDetailBody}>
              {selectedArticle.body.split('\n\n').map((para, i) => {
                if (/^[A-ZААБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯЁІЇЄ].*[A-ZААБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯЁІЇЄ\n]$/.test(para.trim()) && para.trim().length < 80 && !para.includes('•') && !para.match(/^\d+\./)) {
                  return <h3 key={i} className={styles.articleH3}>{para}</h3>
                }
                if (para.includes('•')) {
                  const lines = para.split('\n')
                  return (
                    <div key={i}>
                      {lines.map((line, j) =>
                        line.startsWith('•') ? (
                          <div key={j} className={styles.articleBullet}>
                            <span className={styles.bulletDot}>•</span>
                            <span>{line.slice(1).trim()}</span>
                          </div>
                        ) : (
                          <p key={j} className={styles.articlePara}>{line}</p>
                        )
                      )}
                    </div>
                  )
                }
                if (para.match(/^\d+\./m)) {
                  const lines = para.split('\n')
                  return (
                    <div key={i}>
                      {lines.map((line, j) => {
                        const m = line.match(/^(\d+)\.\s+(.*)/)
                        return m ? (
                          <div key={j} className={styles.articleStep}>
                            <span className={styles.stepNum}>{m[1]}</span>
                            <span>{m[2]}</span>
                          </div>
                        ) : (
                          <p key={j} className={styles.articlePara}>{line}</p>
                        )
                      })}
                    </div>
                  )
                }
                return <p key={i} className={styles.articlePara}>{para}</p>
              })}
            </div>
          </div>

          <button className={styles.backBtn} onClick={() => { setArticleId(null); window.scrollTo(0,0) }} type="button">
            {t.back_to} {selectedCat?.title}
          </button>
        </div>
      </PageShell>
    )
  }

  // ── Render: Category view
  if (selectedCat) {
    return (
      <PageShell lang={lang} setLang={setLang} t={t}>
        <div className={styles.kbInner}>
          <nav className={styles.breadcrumb}>
            <button className={styles.breadLink} onClick={goHome} type="button">Help</button>
            <span className={styles.breadSep}>›</span>
            <span className={styles.breadCurrent}>{selectedCat.title}</span>
          </nav>

          <div className={styles.catHeader}>
            <span className={styles.catHeaderIcon}>{selectedCat.icon}</span>
            <div>
              <h1 className={styles.catHeaderTitle} style={{ color: selectedCat.color }}>{selectedCat.title}</h1>
              <p className={styles.catHeaderDesc}>{selectedCat.desc}</p>
            </div>
          </div>

          <div className={styles.articleList}>
            {selectedCat.articles.map(a => (
              <button
                key={a.id}
                className={styles.articleRow}
                onClick={() => openArticle(selectedCat.id, a.id)}
                type="button"
              >
                <span className={styles.articleRowTitle}>{a.title}</span>
                <span className={styles.articleRowArrow} style={{ color: selectedCat.color }}>›</span>
              </button>
            ))}
          </div>

          <button className={styles.backBtn} onClick={goHome} type="button">{t.back}</button>
        </div>
      </PageShell>
    )
  }

  // ── Render: Home (search results or default)
  return (
    <PageShell lang={lang} setLang={setLang} t={t}>
      <div className={styles.kbHero}>
        <div className={styles.kbHeroInner}>
          <h1 className={styles.kbHeroTitle}>HELP CENTER</h1>
          <p className={styles.kbHeroSub}>Blag Coaching</p>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder={t.search_placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button className={styles.searchClear} onClick={() => setQuery('')} type="button">✕</button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.kbInner}>
        {/* Search results */}
        {query.trim() ? (
          <div>
            {searchResults.length === 0 ? (
              <p className={styles.noResults}>{t.no_results} "{query}"</p>
            ) : (
              <div className={styles.searchResults}>
                <p className={styles.resultsLabel}>{searchResults.length} {lang === 'bg' ? 'резултата' : 'results'}</p>
                {searchResults.map(a => (
                  <button
                    key={`${a.catId}-${a.id}`}
                    className={styles.searchResultRow}
                    onClick={() => openArticle(a.catId, a.id)}
                    type="button"
                  >
                    <span className={styles.resultCat} style={{ color: a.catColor }}>{a.catTitle}</span>
                    <span className={styles.resultTitle}>{a.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Popular */}
            <section>
              <h2 className={styles.sectionLabel}>{t.popular}</h2>
              <div className={styles.popularGrid}>
                {popularArticles.map(a => (
                  <button
                    key={`${a.catId}-${a.id}`}
                    className={styles.popularCard}
                    onClick={() => openArticle(a.catId, a.id)}
                    type="button"
                    style={{ '--cat-color': a.catColor }}
                  >
                    <span className={styles.popularTitle}>{a.title}</span>
                    <span className={styles.popularCat} style={{ color: a.catColor }}>{a.catTitle} ›</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Categories */}
            <section>
              <h2 className={styles.sectionLabel}>{t.categories_label}</h2>
              <div className={styles.categoryGrid}>
                {t.categories.map(cat => (
                  <button
                    key={cat.id}
                    className={styles.categoryCard}
                    onClick={() => openCategory(cat.id)}
                    type="button"
                  >
                    <span className={styles.catIcon}>{cat.icon}</span>
                    <div className={styles.catInfo}>
                      <span className={styles.catTitle} style={{ color: cat.color }}>{cat.title}</span>
                      <span className={styles.catDesc}>{cat.desc}</span>
                    </div>
                    <span className={styles.catCount}>{cat.articles.length}</span>
                    <span className={styles.catArrow} style={{ color: cat.color }}>›</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Contact */}
            <div className={styles.contactBox}>
              <p className={styles.contactTitle}>{t.contact_title}</p>
              <p className={styles.contactSub}>{t.contact_sub}</p>
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

function PageShell({ children, lang, setLang, t }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo}>
            <img src="/icon-192.png" className={styles.logoIcon} alt="" />
            <span className={styles.logoText}>BLAG COACHING</span>
          </a>
          <div className={styles.headerRight}>
            <div className={styles.langToggle}>
              <button className={`${styles.langBtn} ${lang === 'bg' ? styles.langBtnActive : ''}`} onClick={() => setLang('bg')} type="button">БГ</button>
              <button className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`} onClick={() => setLang('en')} type="button">EN</button>
            </div>
            <a href="/" className={styles.openAppBtn}>{t.open_app}</a>
          </div>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>BLAG COACHING</span>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} All rights reserved</span>
          <a href="/" className={styles.footerLink}>{t.open_app} →</a>
        </div>
      </footer>
    </div>
  )
}
