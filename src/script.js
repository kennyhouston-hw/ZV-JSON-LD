document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('schema-form');
    const outputCode = document.getElementById('output-code');
    const copyButton = document.getElementById('copy-button');

    const pageUrlInput = document.getElementById('pageUrl');
    const headlineInput = document.getElementById('headline');
    const descriptionTextarea = document.getElementById('description');
    const imageInput = document.getElementById('image');
    const authorTypeInput = document.getElementById('authorType');
    const authorNameInput = document.getElementById('authorName');
    const authorUrlInput = document.getElementById('authorUrl');
    const datePublishedInput = document.getElementById('datePublished');
    const timePublishedInput = document.getElementById('timePublished');

    const generateBreadcrumbBtn = document.getElementById('generateBreadcrumbBtn');
    const fetchError = document.getElementById('fetchError');

    // Устанавливаем текущую дату и время по умолчанию при загрузке страницы
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    datePublishedInput.value = today;
    timePublishedInput.value = '08:00'; // Устанавливаем время по умолчанию 08:00

    authorNameInput.value = "Hello World";
    authorUrlInput.value = "https://hwschool.online/";

    // Предзаполненные данные для publisher
    const prefilledData = {
        publisher: {
            "@type": "Organization",
            "name": "Hello World",
            "logo": {
                "@type": "ImageObject",
                "url": "https://static.tildacdn.com/tild6438-3464-4739-b364-633037623431/HWS_Logo_FullStylemo.svg"
            }
        }
    };

    let breadcrumbSchema = null; // Переменная для хранения схемы BreadcrumbList

    // Функция для генерации и обновления схемы Article
    const updateArticleSchema = () => {
        const pageUrl = pageUrlInput.value;
        const headline = headlineInput.value;
        const description = descriptionTextarea.value;
        const image = imageInput.value;

        const authorType = authorTypeInput.value;
        const authorName = authorNameInput.value;
        const authorUrl = authorUrlInput.value;

        const author = {
            "@type": authorType,
            "name": authorName
        };
        if (authorUrl) {
            author.url = authorUrl;
        }

        const date = datePublishedInput.value;
        const time = timePublishedInput.value;

        // Объединяем дату и время в требуемый формат ISO 8601
        let formattedDatePublished = '';
        if (date && time) {
            formattedDatePublished = `${date}T${time}:00`; // Добавляем ":00" для секунд
        } else if (date) {
            formattedDatePublished = date; // Если время не указано, используем только дату
        }

        const articleSchema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": pageUrl
            },
            "headline": headline,
            "description": description,
            "image": image,
            "author": author,
            "publisher": prefilledData.publisher,
            "datePublished": formattedDatePublished
        };

        return articleSchema;
    };

    // Функция для генерации схемы BreadcrumbList на основе HTML-содержимого
    function generateBreadcrumbListSchema(htmlContent, baseUrl) {
        fetchError.textContent = ''; // Очищаем предыдущие ошибки
        breadcrumbSchema = null; // Сбрасываем предыдущую схему BreadcrumbList

        if (!htmlContent) {
            fetchError.textContent = 'Не удалось получить HTML-контент для BreadcrumbList.';
            return;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            const breadcrumbListElement = doc.querySelector('ul.t758__list');

            if (!breadcrumbListElement) {
                fetchError.textContent = "Элемент <ul class='t758__list'> не найден в HTML, загруженном по URL. Убедитесь, что HTML корректен и содержит этот элемент.";
                return;
            }

            const itemElements = breadcrumbListElement.querySelectorAll('li.t758__list_item');
            const itemListElements = [];
            let position = 1;

            itemElements.forEach(li => {
                const itemData = {
                    "@type": "ListItem",
                    "position": position
                };

                const linkTag = li.querySelector('a.t-menu__link-item');
                if (linkTag) {
                    const itemName = linkTag.textContent.trim();
                    const href = linkTag.getAttribute('href');
                    const itemUrl = href ? new URL(href, baseUrl).href : null;

                    itemData.name = itemName;
                    if (itemUrl) {
                        itemData.item = itemUrl;
                    }
                } else {
                    const activeItemDiv = li.querySelector('div.t758__link-item_active');
                    if (activeItemDiv) {
                        itemData.name = activeItemDiv.textContent.trim();
                    } else {
                        const wrapperDiv = li.querySelector('.t758__link-item__wrapper');
                        if (wrapperDiv) {
                            itemData.name = wrapperDiv.textContent.trim();
                        }
                    }
                }

                if (itemData.name) {
                    itemListElements.push(itemData);
                    position++;
                }
            });

            if (itemListElements.length === 0) {
                fetchError.textContent = "Не удалось извлечь элементы хлебных крошек из HTML. Проверьте структуру ul.t758__list и li.t758__list_item.";
                return;
            }

            breadcrumbSchema = {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": itemListElements
            };

        } catch (error) {
            console.error("Ошибка при парсинге HTML или генерации JSON-LD BreadcrumbList:", error);
            fetchError.textContent = `Ошибка при парсинге BreadcrumbList: ${error.message}. Убедитесь, что HTML корректен.`;
        }
    }

    // ОБНОВЛЕННАЯ ФУНКЦИЯ: для автоматического заполнения полей headline, description и автора
    async function populateHeadlineAndDescription(url) {
        if (!url) {
            headlineInput.value = '';
            descriptionTextarea.value = '';
            return;
        }

        try {
            const response = await fetch(url); // Используем стандартный fetch
            if (!response.ok) {
                throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
            }
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // --- Заполнение Заголовка и Описания ---
            const title = doc.querySelector('title');
            headlineInput.value = title ? title.textContent.trim() : '';

            const metaDescription = doc.querySelector('meta[name="description"]');
            descriptionTextarea.value = metaDescription ? metaDescription.getAttribute('content').trim() : '';

            // --- Логика определения даты публикации ---
            const dateElement = doc.querySelector('span.date-text.date-icon-calendar');
            if (dateElement) {
                const dateText = dateElement.textContent.trim(); // e.g., "14.08.2024"
                const parts = dateText.split('.');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    // Преобразуем формат ДД.ММ.ГГГГ в ГГГГ-ММ-ДД для input[type="date"]
                    datePublishedInput.value = `${year}-${month}-${day}`;
                }
            }
            // Если элемент не найден, дата останется сегодняшней (установлена по умолчанию).

            // --- Логика определения автора ---
            const authorBlock = doc.querySelector('.t531');
            if (authorBlock) {
                // Блок найден, устанавливаем автора как Person
                authorTypeInput.value = 'Person';
                const authorNameElement = authorBlock.querySelector('.t531__title');
                authorNameInput.value = authorNameElement ? authorNameElement.textContent.trim() : '';
                authorUrlInput.value = 'https://hwschool.online/'; // Устанавливаем URL для Person
            } else {
                // Блок не найден, устанавливаем автора как Organization
                authorTypeInput.value = 'Organization';
                authorNameInput.value = 'Hello World';
                authorUrlInput.value = 'https://hwschool.online/';
            }

            fetchError.textContent = ''; // Очищаем ошибки, если все успешно
        } catch (error) {
            console.error('Ошибка при загрузке страницы для автозаполнения:', error);
            fetchError.textContent = `Ошибка автозаполнения: ${error.message}. Убедитесь, что URL корректен и доступен.`;
            // Очищаем поля при ошибке
            headlineInput.value = '';
            descriptionTextarea.value = '';
            // Сбрасываем автора к организации по умолчанию
            authorTypeInput.value = 'Organization';
            authorNameInput.value = 'Hello World';
            authorUrlInput.value = 'https://hwschool.online/';
        }
    }

    // Функция для обновления всего вывода JSON-LD
    const updateOverallOutput = () => {
        const articleSchema = updateArticleSchema();
        let finalOutput = '';

        // Объединяем схемы в массив, если обе существуют
        if (breadcrumbSchema) {
            finalOutput = `<script type="application/ld+json">\n${JSON.stringify([articleSchema, breadcrumbSchema], null, 2)}\n<\/script>`;
        } else {
            finalOutput = `<script type="application/ld+json">\n${JSON.stringify(articleSchema, null, 2)}\n<\/script>`;
        }
        outputCode.textContent = finalOutput;
    };

    // Изначально генерируем схемы при загрузке страницы
    updateOverallOutput();

    // Добавляем слушатели событий 'input' ко всем полям формы Article для автоматического обновления
    pageUrlInput.addEventListener('input', updateOverallOutput);
    headlineInput.addEventListener('input', updateOverallOutput);
    descriptionTextarea.addEventListener('input', updateOverallOutput);
    imageInput.addEventListener('input', updateOverallOutput);
    authorNameInput.addEventListener('input', updateOverallOutput);
    authorUrlInput.addEventListener('input', updateOverallOutput);
    datePublishedInput.addEventListener('input', updateOverallOutput);
    timePublishedInput.addEventListener('input', updateOverallOutput);

    // Управляем полями автора в зависимости от ручного выбора типа (для возможности переопределения)
    authorTypeInput.addEventListener('change', () => {
        if (authorTypeInput.value === 'Organization') {
            authorNameInput.value = "Hello World";
            authorUrlInput.value = "https://hwschool.online/";
        } else if (authorTypeInput.value === 'Person') {
            // При ручном выборе "Person" очищаем имя для ручного ввода,
            // а URL устанавливаем по умолчанию.
            authorNameInput.value = '';
            authorUrlInput.value = 'https://hwschool.online/';
        }
        updateOverallOutput(); // Обновляем JSON-LD после изменения
    });

    // Слушатель для кнопки генерации BreadcrumbList
    generateBreadcrumbBtn.addEventListener('click', async () => {
        const url = pageUrlInput.value;
        fetchError.textContent = ''; // Очищаем предыдущие ошибки

        if (!url) {
            fetchError.textContent = 'Пожалуйста, введите URL страницы для загрузки HTML.';
            return;
        }

        try {
            // Сначала пытаемся заполнить headline и description
            await populateHeadlineAndDescription(url);

            // Затем получаем HTML для BreadcrumbList
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
            }
            const html = await response.text();
            generateBreadcrumbListSchema(html, url); // Передаем загруженный HTML и URL
            updateOverallOutput(); // Обновляем общий вывод после генерации BreadcrumbList
        } catch (error) {
            console.error('Ошибка при загрузке страницы:', error);
            fetchError.textContent = `Не удалось загрузить страницу: ${error.message}. Убедитесь, что URL корректен и доступен.`;
            breadcrumbSchema = null; // Сбрасываем схему хлебных крошек при ошибке загрузки
            updateOverallOutput(); // Обновляем вывод, чтобы убрать потенциально неактуальную схему BreadcrumbList
        }
    });

    // Дополнительный слушатель на изменение URL, чтобы сразу подтягивать данные Article
    pageUrlInput.addEventListener('change', async () => {
        const url = pageUrlInput.value;
        await populateHeadlineAndDescription(url);
        updateOverallOutput(); // Обновляем вывод после автозаполнения Article
    });


    // Предотвращаем отправку формы по Enter
    form.addEventListener('submit', (event) => {
        event.preventDefault();
    });

    copyButton.addEventListener('click', () => {
        const requiredInputs = form.querySelectorAll('[required]');
        let allFieldsFilled = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                allFieldsFilled = false;
                input.style.border = '1px solid red';
            } else {
                input.style.border = '2px solid transparent'; // Возвращаем исходный стиль
            }
        });

        if (allFieldsFilled) {
            navigator.clipboard.writeText(outputCode.textContent).then(() => {
                copyButton.textContent = 'Скопировано!';
                setTimeout(() => {
                    copyButton.textContent = 'Копировать';
                }, 2000);
            }).catch(err => {
                console.error('Не удалось скопировать текст: ', err);
            });
        } else {
            alert('Пожалуйста, заполните все обязательные поля формы Article.');
        }
    });
});
