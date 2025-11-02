<?php

declare(strict_types=1);

namespace App\Models;

abstract class LibraryItem
{
    public int $id;
    public string $title;
    public int $publicationYear;
    public bool $isAvailable = true;

    public function __construct(int $id, string $title, int $publicationYear, bool $isAvailable = true)
    {
        $this->id = $id;
        $this->title = $title;
        $this->publicationYear = $publicationYear;
        $this->isAvailable = $isAvailable;
    }

    public function markAsUnavailable(): void
    {
        $this->isAvailable = false;
    }
    public function markAsAvailable(): void
    {
        $this->isAvailable = true;
    }

    abstract public function getItemDetails(): string;
}
